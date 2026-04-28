import { getAllUsers, getUsersByTenant } from "./repository";

export const fetchAllUsers = () => {
  return getAllUsers();
};

export const fetchUsersByTenant = (tenantId: string) => {
  return getUsersByTenant(tenantId);
};
