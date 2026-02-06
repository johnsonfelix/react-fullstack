import NextAuth from "next-auth"

declare module "next-auth" {

  interface User {
    username: string,
    profileCompleted: boolean,
    id: string,
    type: string
  }

  interface Session {
    user: User & {
      username: string,
      profileCompleted: boolean,
      userId: string,
      type: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string,
    profileCompleted: boolean,
    userId: string,
    type: string
  }
}