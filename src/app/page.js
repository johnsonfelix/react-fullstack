import Image from "next/image";
import prisma from './prisma'
import Post from "./components/Post";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "./components/User";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return(
    <div>
      <h1>client session</h1>
      <User/>
      <h1>server session</h1>
      {JSON.stringify(session)}
    </div>
  );  
}










// async function getPosts() {
//   const posts = await prisma.post.findMany({
//     where: {published: true},
//     include: {
//       author: {
//         select: {name: true}
//       }
//     }
//   })
//   return posts;
// }

// export default async function Home() {
//   const posts = await getPosts();
//   console.log(posts)
//   return (
//    <main>
//     <Link href='/add-post'>Add Post</Link>
//     <h1>Feed</h1>

//     {
//       posts.map((post)=>{
//         // return (
//         //   <Post
//         //   key = {post.id}
//         //   id = {post.id}
//         //   title = {post.title}
//         //   content = {post.content}
//         //   authorName = {post.author.name}
//         //   />
//         // )
//       })
//     }

//    </main>
//   );
// }
