import { UploadForm } from "@/components/upload-form";
import { parsePublicEnvironment } from "@/lib/env-validation";

export default function Home() {
  const publicEnvironment = parsePublicEnvironment(process.env);

  return (
    <UploadForm maxVideoSizeMb={publicEnvironment.MAX_VIDEO_MB} />
  );
}
