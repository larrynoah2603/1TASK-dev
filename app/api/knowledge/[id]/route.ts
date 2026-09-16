import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { transitionKnowledgeArticle } from "@/lib/knowledge-service";
import { requirePermission } from "@/lib/server-auth";
import { knowledgeArticleStatusSchema } from "@/lib/validation";


export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor = await requirePermission("knowledge:manage");


    const { id } =
      await context.params;


    const input =
      knowledgeArticleStatusSchema.parse(
        await request.json(),
      );


    const article =
      await transitionKnowledgeArticle(
        actor,
        id,
        input,
      );


    return NextResponse.json(article);


  } catch (error) {

    return errorResponse(error);

  }
}