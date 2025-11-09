// app/api/entries/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
const { searchParams } = new URL(req.url);
const cursor = searchParams.get("cursor") ?? undefined;
const take = 20;


const result = await prisma.growthEntry.findMany({
orderBy: { date: "desc" },
take: take + 1,
...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
});


const nextCursor = result.length > take ? result.pop()!.id : null;
// ✅ JSON文字列 → 配列に変換
  const entries = result.map(entry => ({

    ...entry,
    tags: entry.tags ? JSON.parse(entry.tags) : []
  }));

return NextResponse.json({ entries, nextCursor });
}


export async function POST(req: Request) {
const { text, effort, tags } = (await req.json()) as {
text: string;
effort: number;
tags: string[] | undefined //
};


if (!text || !effort) {
return new NextResponse("Bad Request", { status: 400 });
}


const created = await prisma.growthEntry.create({
data: { text, effort, tags: JSON.stringify(tags ?? []) }
});

// レスポンス用にtagsを配列に戻す
const response = {
...created,
tags: JSON.parse(created.tags)
};

return NextResponse.json(response, { status: 201 });
}