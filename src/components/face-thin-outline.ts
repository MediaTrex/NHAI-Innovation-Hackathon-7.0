/** Thin wireframe face outline (replaces thick man1.png base layer). */
const THIN_FACE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
<g fill="none" stroke="#3FEFEF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M172 118 C158 88 178 55 215 48 C248 42 288 46 322 68 C342 86 348 108 344 122"/>
  <path d="M178 55 L170 44 M205 48 L200 36 M235 45 L233 32 M265 47 L268 34 M295 54 L305 42 M322 68 L336 56"/>
  <path d="M172 118 C158 148 154 188 160 228 C166 262 176 292 188 312"/>
  <path d="M344 122 C356 152 360 192 354 232 C348 266 338 296 326 316"/>
  <path d="M188 312 C212 338 252 342 288 338 C312 332 326 316 326 316"/>
  <path d="M252 342 L244 366 L260 366 Z"/>
  <path d="M160 198 C148 194 142 212 144 230 C146 246 154 252 162 240"/>
  <path d="M356 198 C368 194 374 212 372 230 C370 246 362 252 354 240"/>
  <path d="M188 172 C210 166 232 168 248 172"/>
  <path d="M252 172 C268 168 290 166 312 172"/>
  <path d="M196 190 L236 190"/>
  <path d="M264 190 L304 190"/>
  <path d="M250 178 L248 220"/>
  <circle cx="249" cy="224" r="1.6" fill="#3FEFEF"/>
  <path d="M220 258 L280 258"/>
  <path d="M205 342 L188 368"/>
  <path d="M295 342 L312 368"/>
  <path d="M118 418 L188 368"/>
  <path d="M382 418 L312 368"/>
  <path d="M118 418 L382 418"/>
</g>
</svg>`;

export const THIN_FACE_OUTLINE_URI = `data:image/svg+xml,${encodeURIComponent(THIN_FACE_SVG)}`;
