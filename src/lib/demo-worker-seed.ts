import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

import demoEmbedding from '@/data/demo-face-embedding.json';
import { DUMMY_WORKERS } from '@/lib/dummy-workers';
import { embeddingToJson } from '@/lib/embedding';
import { embedFaceFromUri } from '@/lib/face-api';
// Dynamic import avoids circular dependency with database.ts

const DEMO_FACE_ASSET = require('../../assets/images/demo-face.jpg');

let demoFaceUri: string | null = null;

async function resolveBundledDemoFace(): Promise<string> {
  if (demoFaceUri) {
    const info = await FileSystem.getInfoAsync(demoFaceUri);
    if (info.exists) return demoFaceUri;
  }

  const asset = Asset.fromModule(DEMO_FACE_ASSET);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const bundledUri = asset.localUri ?? asset.uri;
  if (!bundledUri) throw new Error('Demo face asset missing.');

  const db = await import('@/lib/database');
  const dir = await db.getFacesDirectory();
  const dest = `${dir}_demo_seed_face.jpg`;
  await FileSystem.copyAsync({ from: bundledUri, to: dest });
  demoFaceUri = dest;
  return dest;
}

async function resolveDemoEmbedding(facePath: string): Promise<string> {
  try {
    const { embedding } = await embedFaceFromUri(facePath);
    return embeddingToJson(embedding);
  } catch {
    return embeddingToJson(demoEmbedding.embedding);
  }
}

function isDemoWorkerEnrolled(emp: {
  face_front_path: string | null;
  face_embedding: string | null;
}): boolean {
  return !!emp.face_front_path && !!emp.face_embedding;
}

/** Pre-enroll all demo workers with bundled face photo + embedding. */
export async function seedDemoWorkerEnrollments(): Promise<void> {
  const db = await import('@/lib/database');
  const facePath = await resolveBundledDemoFace();
  const embeddingJson = await resolveDemoEmbedding(facePath);

  for (const worker of DUMMY_WORKERS) {
    const existing = await db.getEmployeeByEmployeeId(worker.employeeId);
    if (existing && isDemoWorkerEnrolled(existing)) continue;

    const workerFace = `${(await db.getFacesDirectory())}${worker.employeeId.replace(/[^a-zA-Z0-9_-]/g, '_')}_demo_front.jpg`;
    const info = await FileSystem.getInfoAsync(workerFace);
    if (!info.exists) {
      await FileSystem.copyAsync({ from: facePath, to: workerFace });
    }

    if (existing) {
      await db.upsertEmployee({
        employeeId: worker.employeeId,
        fullName: worker.fullName,
        department: worker.department,
        siteLocation: worker.siteLocation,
        faceFrontPath: workerFace,
        faceLeftPath: workerFace,
        faceRightPath: workerFace,
        faceEmbedding: embeddingJson,
      });
    } else {
      await db.saveEmployee({
        employeeId: worker.employeeId,
        fullName: worker.fullName,
        department: worker.department,
        siteLocation: worker.siteLocation,
        faceFrontPath: workerFace,
        faceLeftPath: workerFace,
        faceRightPath: workerFace,
        faceEmbedding: embeddingJson,
      });
    }
  }
}
