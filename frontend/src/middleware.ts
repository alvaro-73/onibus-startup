import { NextResponse, type NextRequest } from "next/server";

// Protege /aluno e /motorista. Como a autenticacao do Firebase no cliente
// nao gera cookies automaticamente, fazemos uma verificacao leve: se nao
// houver indicador de sessao no cookie 'fluxbus_auth', redireciona para
// /login. O cookie eh gravado pelos componentes apos login bem sucedido.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protegido = pathname.startsWith("/aluno") || pathname.startsWith("/motorista");
  if (!protegido) return NextResponse.next();

  const sessao = req.cookies.get("fluxbus_auth")?.value;
  if (!sessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/aluno/:path*", "/motorista/:path*"],
};
