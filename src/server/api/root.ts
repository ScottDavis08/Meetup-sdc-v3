import { createTRPCRouter } from "@/server/api/trpc";
import { exampleRouter } from "@/server/api/routers/example";
import { eventRouter } from "./routers/event";
import { techRouter } from "./routers/tech";
import { projectRouter } from "./routers/project";
import { likeRouter } from "./routers/like";
import { userRouter } from "./routers/User/user";
import { superProjectRouter } from "./routers/superProject";
import { chapterRouter } from "./routers/chapter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  events: eventRouter,
  techs: techRouter,
  projects: projectRouter,
  likes: likeRouter,
  users: userRouter,
  superProjects: superProjectRouter, 
  chapters: chapterRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
