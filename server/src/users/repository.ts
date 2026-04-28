import prisma from "../prisma";

export const getAllUsers = () => {
  return prisma.user.findMany();
};

export const getUsersByTenant = (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenant_id: tenantId },
  });
};
