import prisma from "../prisma";
import { PurchaseRequestData } from "./validation";
import { PaymeSaleResponse } from "./service";

export const savePurchase = async (
  data: PurchaseRequestData,
  payme: PaymeSaleResponse,
) => {
  return await prisma.purchase.create({
    data: {
      offer_id: data.offerId,
      tenant_id: data.tenantId,
      buyer_name: data.buyer_name,
      buyer_email: data.buyer_email,
      buyer_phone: data.buyer_phone,
      amount: data.amount,
      transaction_id: payme.transaction_id,
      payme_sale_id: payme.payme_sale_id,
      payme_sale_code: payme.payme_sale_code,
      sale_url: payme.sale_url,
      receipt_details: data.receiptDetails,
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
