import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditLog } from "@/lib/audit";
import { deleteCacheKey } from "@/lib/distributed-cache";
import { errorResponse } from "@/lib/http";
import { requireAdminAccess } from "@/lib/server-auth";
import { z } from "zod";
import { DomainError } from "@/lib/domain-error";
import { confidentialRecipientHasProcessingCapability } from "@/lib/confidential-ticket-service";

import { requireProductCapability } from "@/lib/product-policy.server";

const schema = z.object({ allowConfidentialTickets: z.boolean(), confidentialPrimaryRecipientId: z.string().cuid().nullable(), confidentialSubstituteId: z.string().cuid().nullable(), reason: z.string().trim().min(10).max(2000) }).superRefine((v,c)=>{ if(v.allowConfidentialTickets&&!v.confidentialPrimaryRecipientId)c.addIssue({code:"custom",path:["confidentialPrimaryRecipientId"],message:"Un destinataire principal est obligatoire."}); if(v.confidentialPrimaryRecipientId&&v.confidentialPrimaryRecipientId===v.confidentialSubstituteId)c.addIssue({code:"custom",path:["confidentialSubstituteId"],message:"Le remplaçant doit être différent."}); });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
 try { requireProductCapability("confidentialTicketCreation"); const actor=await requireAdminAccess("FUNCTIONAL"); const {id}=await context.params; const input=schema.parse(await request.json());
 const ids=[input.confidentialPrimaryRecipientId,input.confidentialSubstituteId].filter(Boolean) as string[];
 if (!(await Promise.all(ids.map(confidentialRecipientHasProcessingCapability))).every(Boolean)) throw new DomainError("Chaque destinataire doit être actif et disposer d’une capacité de traitement de ticket.",422);
 const updated=await prisma.$transaction(async tx=>{const previous=await tx.serviceCatalogItem.findUnique({where:{id}}); if(!previous)throw new DomainError("Service introuvable.",404); const service=await tx.serviceCatalogItem.update({where:{id},data:{allowConfidentialTickets:input.allowConfidentialTickets,confidentialPrimaryRecipientId:input.confidentialPrimaryRecipientId,confidentialSubstituteId:input.confidentialSubstituteId,confidentialityVersion:{increment:1}}}); await appendAuditLog(tx,{actorId:actor.id,action:"CATALOG_CONFIDENTIALITY_CONFIGURED",objectType:"ServiceCatalogItem",objectId:id,oldValue:{allowConfidentialTickets:previous.allowConfidentialTickets,primaryRecipientId:previous.confidentialPrimaryRecipientId,substituteId:previous.confidentialSubstituteId},newValue:{allowConfidentialTickets:service.allowConfidentialTickets,primaryRecipientId:service.confidentialPrimaryRecipientId,substituteId:service.confidentialSubstituteId},reason:input.reason}); return service;}); await deleteCacheKey("catalog:active:v1"); return NextResponse.json(updated);
 } catch(error){return errorResponse(error);} }
