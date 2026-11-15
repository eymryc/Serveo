import { NextResponse } from "next/server";

// Route publique lue au demarrage de l'app mobile : permet de bloquer les
// APK trop anciens (incompatibles avec l'API) et d'indiquer ou telecharger
// la nouvelle version — les APK sont distribues hors store, sans mise a
// jour automatique. MIN_MOBILE_APP_VERSION vide = aucun blocage.
export async function GET() {
  return NextResponse.json(
    {
      minMobileVersion: process.env.MIN_MOBILE_APP_VERSION || null,
      androidApkUrl: process.env.NEXT_PUBLIC_ANDROID_APK_URL || null,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
