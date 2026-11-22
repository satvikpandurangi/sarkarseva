import { RecordDetail } from "@/features/catalogue/RecordDetail";

export const metadata = { title: "Scheme reference — SarkarSeva" };
export default async function RecordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RecordDetail slug={slug} />;
}
