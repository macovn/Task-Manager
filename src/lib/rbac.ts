export type UserRole = 'admin' | 'giam_doc' | 'pho_giam_doc' | 'truong_phong' | 'pho_truong_phong' | 'nhan_vien';

const ROLE_WEIGHTS: Record<UserRole, number> = {
  'admin': 0,
  'giam_doc': 100,
  'pho_giam_doc': 80,
  'truong_phong': 60,
  'pho_truong_phong': 40,
  'nhan_vien': 20,
};

/**
 * RBAC Logic for task assignment
 * @param fromRole Role of the person assigning the task
 * @param toRole Role of the person receiving the task
 * @param isSelf Whether the user is assigning to themselves
 */
export function canAssign(fromRole: UserRole, toRole: UserRole, isSelf: boolean): boolean {
  // mapped assignment rules as per request
  const ROLE_ASSIGN_MAP: Record<UserRole, UserRole[]> = {
    admin: ['admin', 'giam_doc', 'pho_giam_doc', 'truong_phong', 'pho_truong_phong', 'nhan_vien'],
    giam_doc: ['pho_giam_doc', 'truong_phong', 'pho_truong_phong', 'nhan_vien'],
    pho_giam_doc: ['truong_phong', 'pho_truong_phong', 'nhan_vien'],
    truong_phong: ['pho_truong_phong', 'nhan_vien'],
    pho_truong_phong: ['nhan_vien'],
    nhan_vien: []
  };

  if (isSelf) return true; // Always allow assigning to self
  if (fromRole === 'admin') return true; // Admin can always assign to anyone
  
  const allowed = ROLE_ASSIGN_MAP[fromRole] || [];
  return allowed.includes(toRole);
}
