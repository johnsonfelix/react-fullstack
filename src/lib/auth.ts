import { NextAuthOptions } from "next-auth";
import CredentialsProvider  from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/app/prisma";
import { compare } from "bcrypt";

var profileComplete:any;

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    secret:process.env.NEXT_AUTH_SECRET,
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/sign-in',
    },
    providers: [
        CredentialsProvider({
          // The name to display on the sign in form (e.g. "Sign in with...")
          name: "Credentials",
          // `credentials` is used to generate a form on the sign in page.
          // You can specify which fields should be submitted, by adding keys to the `credentials` object.
          // e.g. domain, username, password, 2FA token, etc.
          // You can pass any HTML attribute to the <input> tag through the object.
          credentials: {
            email: { label: "Email", type: "text", placeholder: "jsmith@gmail.com" },
            password: { label: "Password", type: "password" }
          },
          async authorize(credentials) {
            

            if(!credentials?.email || !credentials?.password){
                return null;
            }

            const exsistingUser = await prisma.user.findUnique({
                where: {email: credentials?.email}
            });
            profileComplete = exsistingUser?.profileCompleted;
            if(!exsistingUser) {
                return null;
            }

            const passwordMatch = await compare(credentials.password, exsistingUser.password)

            if(!passwordMatch) {
                return null;
            }

            return {
                id: `${exsistingUser.id}`,
                username: exsistingUser.username,
                email: exsistingUser.email,
                profileCompleted: exsistingUser.profileCompleted,
            }

          }
        })
      ],
      callbacks: {

        async jwt({ token, user}) {
            // console.log(token,user);
            if(user) {
                return {
                    ...token,
                    username: user.username,
                    profileCompleted: profileComplete,
                    userId: token.sub
                }
            }

            return token;
          },
        async session({ session, token }) {
            // console.log(session,token);

            return {
                ...session,
                user: {
                    ...session.user,
                    username: token.username,                    
                    userId: token.sub,
                    profileCompleted: profileComplete,
                }
            }
            
          },
      }
}

