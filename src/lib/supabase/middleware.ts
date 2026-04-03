import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Omdiriger admin til dedikert admin-innlogging hvis ikke logget inn
  if (pathname.startsWith('/portal/admin') && !user) {
    return NextResponse.redirect(new URL('/admin/logg-inn', request.url))
  }

  // Omdiriger innloggede brukere bort fra admin-innloggingssiden
  if (pathname === '/admin/logg-inn' && user) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  // Beskytt portal-ruter
  if (pathname.startsWith('/portal')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/logg-inn'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Hent brukerrolle
    const { data: profil } = await supabase
      .from('user_profiles')
      .select('rolle')
      .eq('id', user.id)
      .single()

    const rolle = (profil as { rolle?: string } | null)?.rolle

    // Ruter til riktig portal basert på rolle
    if (pathname === '/portal') {
      const url = request.nextUrl.clone()
      if (rolle === 'admin') {
        url.pathname = '/portal/admin'
      } else if (rolle === 'takstmann' || rolle === 'takstmann_admin') {
        url.pathname = '/portal/takstmann'
      } else if (rolle === 'megler') {
        url.pathname = '/portal/megler'
      } else if (rolle === 'privatkunde') {
        url.pathname = '/portal/kunde'
      }
      return NextResponse.redirect(url)
    }

    // Blokkér feil portal
    if (pathname.startsWith('/portal/admin') && rolle !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    if (pathname.startsWith('/portal/takstmann') && rolle !== 'takstmann' && rolle !== 'takstmann_admin' && rolle !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    if (pathname.startsWith('/portal/megler') && rolle !== 'megler' && rolle !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    if (pathname.startsWith('/portal/kunde') && rolle !== 'privatkunde' && rolle !== 'admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  }

  // Omdiriger innloggede brukere bort fra logg-inn/registrer
  if (user && (pathname === '/logg-inn' || pathname.startsWith('/registrer'))) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  return supabaseResponse
}
