import prisma from "../prisma";

export const getAllTenants = () => {
  return prisma.tenant.findMany();
};

export const getTenantById = (id: string) => {
  return prisma.tenant.findUnique({ where: { id } });
};
