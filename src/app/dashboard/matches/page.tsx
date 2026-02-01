import { Suspense } from "react";
import MatchesClient from "./MatchesClient";

export const dynamic = "force-dynamic";

export default function MatchesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-12">Carregando partidas...</div>}>
            <MatchesClient />
        </Suspense>
    );
}
