import React, { cache as reactCache } from 'react';
import pool from '@/lib/db';
import { notFound } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import SingleBlogLayout from '@/components/SingleBlogLayout';
import { Metadata } from 'next';

export const revalidate = 60;

function sanitizeContent(content: string | null | undefined): string {
  if (!content) return '';

  return sanitizeHtml(content, {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'a', 'img', 'figure', 'figcaption',
      'pre', 'code', 'hr', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  });
}

// Performance optimization: React cache with category join to fetch the category name.
const getBlog = reactCache(async (slug: string) => {
  const [rows]: any = await pool.query(
    `SELECT blogs.*, blog_categories.name AS category_name
     FROM blogs
     LEFT JOIN blog_categories ON blogs.category_id = blog_categories.id
     WHERE blogs.slug = ? AND LOWER(blogs.status) = 'published'
     LIMIT 1`,
    [slug],
  );

  return rows[0] || null;
});

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://jnsedu.com'
).replace(/\/+$/, '');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const blog = await getBlog(resolvedParams.slug);

  if (!blog) {
    return { title: 'Blog Not Found' };
  }

  const cleanDescription = blog.content
    ? sanitizeHtml(blog.content, { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 160)
    : '';

  return {
    title: blog.title,
    description: cleanDescription,
    openGraph: {
      title: blog.title,
      description: cleanDescription,
      url: `${SITE_URL}/blog/${blog.slug}`,
      images: [
        {
          url: blog.cover_image || `${SITE_URL}/images/Icons/Jns-Education-Logo.svg`,
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: cleanDescription,
      images: [
        blog.cover_image || `${SITE_URL}/images/Icons/Jns-Education-Logo.svg`,
      ],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const blog = await getBlog(resolvedParams.slug);

  if (!blog) {
    notFound();
  }

  return (
    <SingleBlogLayout
      blog={{
        ...blog,
        content: sanitizeContent(blog.content),
      }}
    />
  );
}
