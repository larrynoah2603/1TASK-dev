import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { createKnowledgeArticle, listKnowledgeArticles } from "@/lib/knowledge-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { knowledgeArticleSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    return NextResponse.json({ articles: await listKnowledgeArticles(actor, query) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUserContext();
    const article = await createKnowledgeArticle(actor, knowledgeArticleSchema.parse(await request.json()));
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
