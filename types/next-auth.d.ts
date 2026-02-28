import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
    /** Set when a superuser is impersonating another user */
    impersonating?: boolean
    /** Real (admin) user when impersonating; used for "Stop impersonating" and superuser checks */
    realUser?: {
      id: string
      name?: string | null
      email?: string | null
    }
  }
}

