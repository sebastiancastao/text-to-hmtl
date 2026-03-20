import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  // Extract document ID from various Google Docs URL formats
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "URL de Google Docs no válida" },
      { status: 400 }
    );
  }

  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  try {
    const res = await fetch(exportUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo acceder al documento. ¿Es público?" },
        { status: 502 }
      );
    }
    const text = await res.text();
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener el documento" },
      { status: 500 }
    );
  }
}
