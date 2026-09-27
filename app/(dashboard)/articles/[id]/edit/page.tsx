import { notFound } from 'next/navigation';
import { ArticleForm } from '@/components/article-form';
import { requireAdmin } from '@/lib/admin-auth';
export default async function EditArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) { const { id } = await params; const { error } = await searchParams; const { supabase } = await requireAdmin(); const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle(); if (!data) notFound(); return <div><h1 className="text-2xl font-extrabold">Edit article</h1><p className="mt-1 text-sm text-admin-muted">Update content, publishing and SEO settings.</p><div className="mt-6"><ArticleForm article={data} error={error} /></div></div>; }
