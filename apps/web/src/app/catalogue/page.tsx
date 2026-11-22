import { Suspense } from "react";
import { Catalogue } from "@/features/catalogue/Catalogue";

export const metadata = { title: "Scheme catalogue — SarkarSeva" };
export default function CataloguePage() {
  return (
    <Suspense>
      <Catalogue />
    </Suspense>
  );
}
