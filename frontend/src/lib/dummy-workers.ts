export type DummyWorker = {
  employeeId: string;
  fullName: string;
  department: string;
  siteLocation: string;
};

/** Demo field workers for quick enrollment during hackathon demos. */
export const DUMMY_WORKERS: DummyWorker[] = [
  {
    employeeId: 'NHAI-WRK-001',
    fullName: 'Rajesh Kumar',
    department: 'Highway Maintenance',
    siteLocation: 'Delhi–Jaipur Expressway',
  },
  {
    employeeId: 'NHAI-WRK-002',
    fullName: 'Priya Sharma',
    department: 'Toll Operations',
    siteLocation: 'Mumbai–Pune Highway',
  },
  {
    employeeId: 'NHAI-WRK-003',
    fullName: 'Amit Patel',
    department: 'Site Safety',
    siteLocation: 'Ahmedabad–Vadodara Corridor',
  },
  {
    employeeId: 'NHAI-WRK-004',
    fullName: 'Suresh Reddy',
    department: 'Field Survey',
    siteLocation: 'Bangalore–Mysore Section',
  },
  {
    employeeId: 'NHAI-WRK-005',
    fullName: 'Kavita Singh',
    department: 'Quality Inspection',
    siteLocation: 'Chandigarh–Ludhiana Highway',
  },
  {
    employeeId: 'NHAI-WRK-006',
    fullName: 'Mohammed Irfan',
    department: 'Bridge Construction',
    siteLocation: 'Chennai–Trichy NH-38',
  },
];
