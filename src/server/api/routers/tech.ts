import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  createTechSchema,
  updateTechSchema,
  getTechSchema,
  techOutputSchema,
} from "./schema/tech.schema";
import { z } from "zod";

function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
import { TRPCError } from "@trpc/server";

export const techRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.array(techOutputSchema))
    .query(async ({ ctx }) => {
      const techs = await ctx.prisma.masterTech.findMany({
        orderBy: {
          label: "asc",
        },
        include: {
          _count: {
            select: {
              Tech: true,
            },
          },
        },
      });

      return techs;
    }),

  getById: publicProcedure
    .input(getTechSchema)
    .output(techOutputSchema)
    .query(async ({ ctx, input }) => {
      const tech = await ctx.prisma.masterTech.findUnique({
        where: {
          id: input.id,
        },
        include: {
          _count: {
            select: {
              Tech: true,
            },
          },
        },
      });

      if (!tech) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tech stack not found",
        });
      }

      return tech;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .output(techOutputSchema)
    .query(async ({ ctx, input }) => {
      const tech = await ctx.prisma.masterTech.findFirst({
        where: {
          slug: input.slug,
        },
        include: {
          _count: {
            select: {
              Tech: true,
            },
          },
        },
      });

      if (!tech) {
        throw new Error("Tech stack not found");
      }

      return tech;
    }),

  create: protectedProcedure
    .input(createTechSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create tech stacks",
        });
      }

      const slug = input.slug
        ? input.slug.toLowerCase()
        : generateSlug(input.label);

      const existing = await ctx.prisma.masterTech.findFirst({
        where: { slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A tech stack with this slug already exists",
        });
      }

      const tech = await ctx.prisma.masterTech.create({
        data: {
          slug,
          label: input.label,
          imgUrl: input.imgUrl,
        },
      });

      return tech;
    }),

  update: protectedProcedure
    .input(updateTechSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update tech stacks",
        });
      }

      const { id, ...data } = input;

      if (data.slug !== undefined || data.label !== undefined) {
        let finalSlug: string;

        if (data.slug && data.slug.trim()) {
          finalSlug = data.slug;
        } else if (data.label) {
          finalSlug = generateSlug(data.label);
        } else {
          const existing = await ctx.prisma.masterTech.findUnique({
            where: { id },
            select: { label: true },
          });
          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tech stack not found",
            });
          }
          finalSlug = generateSlug(existing.label);
        }

        const conflicting = await ctx.prisma.masterTech.findFirst({
          where: {
            slug: finalSlug,
            NOT: { id },
          },
        });

        if (conflicting) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A tech stack with this slug already exists",
          });
        }

        data.slug = finalSlug;
      }

      const tech = await ctx.prisma.masterTech.update({
        where: { id },
        data,
      });

      return tech;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete tech stacks",
        });
      }

      const usageCount = await ctx.prisma.tech.count({
        where: { masterTechId: input.id },
      });

      if (usageCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete tech stack. It is used in ${usageCount} project(s).`,
        });
      }

      const tech = await ctx.prisma.masterTech.delete({
        where: { id: input.id },
      });

      return tech;
    }),
});
