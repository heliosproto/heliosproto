import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-12">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-5xl font-semibold tracking-tight">Helios Wallet</h1>
        <p className="max-w-xl text-center text-lg text-muted-foreground">
          Smart-account-native wallet for the Stellar ecosystem. Passkey login, session keys, social
          recovery, sponsored transactions — built around Soroban C-addresses as the primary
          identity.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Create a smart account or connect an existing one.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full">Create wallet</Button>
          <Button variant="outline" className="w-full">
            Connect existing
          </Button>
        </CardContent>
        <CardFooter>
          <a
            href="https://github.com/heliosproto/heliosproto"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Source on GitHub
          </a>
        </CardFooter>
      </Card>
    </main>
  );
}
