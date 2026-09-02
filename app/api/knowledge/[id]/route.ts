import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { transitionKnowledgeArticle } from "@/lib/knowledge-service";
import { requireSessionUserContext } from "@/lib/server-auth";
import { knowledgeArticleStatusSchema } from "@/lib/validation";


function requirePermission(
  actor: Awaited<ReturnType<typeof requireSessionUserContext>>,
  permission: string,
) {

  const permissions =
    actor.roleAssignments.flatMap(
      (assignment) =>
        assignment.role.permissions.map(
          (item) => item.permission.code,
        ),
    );


  if (!permissions.includes(permission)) {
    throw new Error(
      "Permission insuffisante.",
    );
  }
}



export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {

  try {

    const actor =
      await requireSessionUserContext();


    requirePermission(
      actor,
      "knowledge:manage",
    );


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