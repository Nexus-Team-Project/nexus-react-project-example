import prisma from "../prisma";
import { PurchaseRequestData } from "./validation";
import { PaymeSaleResponse } from "./service";
import { PurchaseStatus } from "@prisma/client";

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const savePurchase = async (
  data: PurchaseRequestData,
  payme: PaymeSaleResponse,
  userId: string,
) => {
  return await prisma.purchase.create({
    data: {
      offer_id: data.offerId,
      user_id: userId,
      tenant_id: data.tenantId,
      amount: data.amount,
      transaction_id: payme.transaction_id,
      payme_sale_id: payme.payme_sale_id,
      payme_sale_code: payme.payme_sale_code,
      sale_url: payme.sale_url,
      receipt_details: data.receiptDetails,
    },
  });
};

export const updatePurchaseByCallback = async (
  transactionId: string,
  data: { status: PurchaseStatus; payme_transaction_id?: string | null },
) => {
  return await prisma.purchase.update({
    where: { transaction_id: transactionId },
    data: {
      status: data.status,
      payme_transaction_id: data.payme_transaction_id,
    },
  });
};

export const getOffer = async (offerId: string) => {
  return await prisma.merchantsOffers.findUnique({
    where: { id: offerId },
    select: {
      status: true,
      available_quantity: true,
      title: true,
      merchant: {
        select: {
          payme_seller_id: true,
          payme_api_key: true,
          commission_rate: true,
        },
      },
    },
  });
};
