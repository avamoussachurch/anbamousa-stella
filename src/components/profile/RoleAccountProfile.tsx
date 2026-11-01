import React from 'react';
import type { Role } from '../../types';
import { AdminAccountProfile } from './AdminAccountProfile';
import { ParentAccountProfile } from './ParentAccountProfile';
import { ServantAccountProfile } from './ServantAccountProfile';
import type { RoleProfileProps } from './RoleProfileShared';

interface RoleAccountProfileProps extends RoleProfileProps {
  role: Exclude<Role, 'student'>;
}

export function RoleAccountProfile({ role, ...props }: RoleAccountProfileProps) {
  switch (role) {
    case 'parent':
      return <ParentAccountProfile {...props} />;
    case 'teacher':
      return <ServantAccountProfile {...props} />;
    case 'admin':
      return <AdminAccountProfile {...props} />;
  }
}
