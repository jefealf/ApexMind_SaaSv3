import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0b0f19]">
            <SignIn appearance={{
                elements: {
                    formButtonPrimary: 'bg-cyan-600 hover:bg-cyan-700 text-sm normal-case',
                    card: 'bg-[#1e293b] border border-slate-700',
                    headerTitle: 'text-white',
                    headerSubtitle: 'text-slate-400',
                    socialButtonsBlockButton: 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                    socialButtonsBlockButtonText: 'text-white font-normal',
                    formFieldLabel: 'text-slate-300',
                    formFieldInput: 'bg-slate-900 border-slate-700 text-white',
                    footerActionLink: 'text-cyan-400 hover:text-cyan-300'
                }
            }} />
        </div>
    );
}
