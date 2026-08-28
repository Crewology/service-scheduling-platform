import { UXPrototypeShell } from "@/components/prototype/UXPrototypeShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROTOTYPE_ROUTES, type PrototypeBookingMode } from "@/lib/uxPrototype";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const directSteps = ["Match", "Date & time", "Details", "Review & pay", "Confirmed"];
const quoteSteps = ["Match", "Project", "Timing & place", "Review request", "Submitted"];
const timeSlots = ["4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM"];

export default function AdaptiveBookingPrototype() {
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialMode = params.get("mode") === "quote" ? "quote" : "direct";
  const [mode, setMode] = useState<PrototypeBookingMode>(initialMode);
  const [step, setStep] = useState(0);
  const [selectedTime, setSelectedTime] = useState("5:00 PM");
  const [serviceAddress, setServiceAddress] = useState("128 Peachtree Street, Atlanta, GA");
  const [projectDetails, setProjectDetails] = useState("Church sound support for an evening program with approximately 220 guests.");
  const [contactName, setContactName] = useState("Maya Johnson");
  const [contactPhone, setContactPhone] = useState("(404) 555-0184");
  const [preferredDate, setPreferredDate] = useState("2026-08-30");

  const query = params.get("query") || (mode === "direct" ? "A1 Lead Audio Engineer" : "Church sound event");
  const location = params.get("location") || "Atlanta, GA";
  const timing = params.get("timing") || "This weekend";
  const isRebook = params.get("rebook") === "1";
  const steps = mode === "direct" ? directSteps : quoteSteps;

  function switchMode(nextMode: PrototypeBookingMode) {
    setMode(nextMode);
    setStep(0);
  }

  function continueFlow() {
    if (step < steps.length - 1) setStep((current) => current + 1);
  }

  function back() {
    if (step === 0) setLocation(PROTOTYPE_ROUTES.customer);
    else setStep((current) => current - 1);
  }

  return (
    <UXPrototypeShell
      title="Adaptive booking prototype"
      description="The selected service determines whether the customer books now or requests a custom quote"
      active="booking"
    >
      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#204a73]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Sparkles className="h-4 w-4" /></span>
            <div><p className="font-semibold">Review both versions of the same journey</p><p className="mt-0.5 text-xs leading-5 text-blue-700">Switch paths to see how fixed-price services lead to booking while custom work leads to a quote request.</p></div>
          </div>
          <div className="grid shrink-0 grid-cols-2 rounded-xl bg-white p-1 shadow-sm">
            <button type="button" onClick={() => switchMode("direct")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${mode === "direct" ? "bg-[#174a73] text-white" : "text-slate-500 hover:bg-slate-50"}`}>Direct booking</button>
            <button type="button" onClick={() => switchMode("quote")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-[0.97] ${mode === "quote" ? "bg-[#174a73] text-white" : "text-slate-500 hover:bg-slate-50"}`}>Quote request</button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Booking progress">
        {steps.map((label, index) => (
          <div key={label} className="flex shrink-0 items-center gap-2">
            <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${index === step ? "bg-[#174a73] text-white" : index < step ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-400"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${index === step ? "bg-white/20" : index < step ? "bg-emerald-200" : "bg-slate-100"}`}>{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
              {label}
            </div>
            {index < steps.length - 1 ? <span className="h-px w-4 bg-slate-200" /> : null}
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_65px_-42px_rgba(15,23,42,0.55)]">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
            <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />{step === 0 ? "Back to customer home" : "Previous step"}</button>
          </div>
          <div className="p-5 sm:p-7">
            {step === 0 ? <MatchStep mode={mode} query={query} location={location} timing={timing} isRebook={isRebook} onContinue={continueFlow} onSwitch={switchMode} /> : null}
            {mode === "direct" && step === 1 ? <DirectScheduleStep selectedTime={selectedTime} setSelectedTime={setSelectedTime} preferredDate={preferredDate} setPreferredDate={setPreferredDate} onContinue={continueFlow} /> : null}
            {mode === "direct" && step === 2 ? <DirectDetailsStep name={contactName} setName={setContactName} phone={contactPhone} setPhone={setContactPhone} address={serviceAddress} setAddress={setServiceAddress} onContinue={continueFlow} /> : null}
            {mode === "direct" && step === 3 ? <DirectReviewStep selectedTime={selectedTime} date={preferredDate} address={serviceAddress} onContinue={continueFlow} /> : null}
            {mode === "direct" && step === 4 ? <DirectConfirmation onRestart={() => { setStep(0); toast.success("Prototype reset"); }} /> : null}

            {mode === "quote" && step === 1 ? <QuoteProjectStep details={projectDetails} setDetails={setProjectDetails} onContinue={continueFlow} /> : null}
            {mode === "quote" && step === 2 ? <QuoteTimingStep date={preferredDate} setDate={setPreferredDate} address={serviceAddress} setAddress={setServiceAddress} onContinue={continueFlow} /> : null}
            {mode === "quote" && step === 3 ? <QuoteReviewStep details={projectDetails} date={preferredDate} address={serviceAddress} onContinue={continueFlow} /> : null}
            {mode === "quote" && step === 4 ? <QuoteConfirmation onRestart={() => { setStep(0); toast.success("Prototype reset"); }} /> : null}
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] lg:sticky lg:top-28">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#153f61] text-sm font-bold text-white">CA</span>
            <div className="min-w-0"><p className="font-semibold">Chisolm Audio</p><p className="text-xs text-slate-500">Hoschton, GA · Travels to you</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="mr-1 h-3 w-3" />Identity verified</Badge>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800"><Star className="mr-1 h-3 w-3 fill-current" />4.9</Badge>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Your selection</p>
            <h2 className="mt-2 font-bold">{mode === "direct" ? "A1 — Lead Audio Engineer" : "Church Sound Consultation"}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === "direct" ? "Full day (10 hrs) · Private location" : "Custom event support · Quote required"}</p>
          </div>
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <SummaryRow icon={MapPin} label={location} />
            <SummaryRow icon={CalendarDays} label={step > 0 ? formatPrototypeDate(preferredDate) : timing} />
            {mode === "direct" && step > 1 ? <SummaryRow icon={Clock3} label={selectedTime} /> : null}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            {mode === "direct" ? <><div className="flex items-center justify-between"><span className="text-sm text-slate-600">Service total</span><span className="text-lg font-bold">$550.00</span></div><p className="mt-2 text-xs leading-5 text-slate-500">No charge is made in this review prototype.</p></> : <><p className="text-sm font-semibold">No payment today</p><p className="mt-1 text-xs leading-5 text-slate-500">The provider reviews your project and sends a price before you commit.</p></>}
          </div>
        </aside>
      </div>
    </UXPrototypeShell>
  );
}

function MatchStep({ mode, query, location, timing, isRebook, onContinue, onSwitch }: { mode: PrototypeBookingMode; query: string; location: string; timing: string; isRebook: boolean; onContinue: () => void; onSwitch: (mode: PrototypeBookingMode) => void }) {
  return (
    <div>
      {isRebook ? <div className="mb-5 flex gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-900"><RefreshCw className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Your previous booking details are ready</p><p className="mt-1 text-sm text-violet-800">Choose a new date and confirm what has changed. You do not need to start over.</p></div></div> : null}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Matched to your need</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{mode === "direct" ? "This service can be booked now" : "This project needs a custom quote"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">You searched for “{query}” near {location}, {timing.toLowerCase()}. OlogyCrew uses the service’s pricing and scheduling setup to choose the right next step.</p>

      <div className={`mt-6 rounded-2xl border p-5 ${mode === "direct" ? "border-emerald-200 bg-emerald-50/60" : "border-violet-200 bg-violet-50/60"}`}>
        <div className="flex items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mode === "direct" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>{mode === "direct" ? <CalendarDays className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{mode === "direct" ? "A1 — Lead Audio Engineer" : "Church Sound Consultation"}</h2><span className="text-lg font-bold">{mode === "direct" ? "$550" : "Custom quote"}</span></div>
            <p className="mt-1 text-sm text-slate-600">{mode === "direct" ? "The price and available start times are already defined, so you can confirm today." : "The price depends on the venue, guest count, equipment, and schedule. Send the details first."}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline" className="bg-white">Chisolm Audio</Badge><Badge variant="outline" className="bg-white">Responds in about 1 hour</Badge><Badge variant="outline" className="bg-white">Identity verified</Badge></div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => onSwitch(mode === "direct" ? "quote" : "direct")} className="text-sm font-semibold text-slate-500 hover:text-[#174a73] hover:underline">Preview the {mode === "direct" ? "quote request" : "direct booking"} path instead</button>
        <Button size="lg" onClick={onContinue}>{mode === "direct" ? "Choose date and time" : "Describe the project"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function DirectScheduleStep({ selectedTime, setSelectedTime, preferredDate, setPreferredDate, onContinue }: { selectedTime: string; setSelectedTime: (value: string) => void; preferredDate: string; setPreferredDate: (value: string) => void; onContinue: () => void }) {
  return (
    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Direct booking</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Choose the call time</h1><p className="mt-2 text-sm text-slate-600">For full-day production services, the selected time is the call time. The provider’s availability supports evening starts.</p>
      <div className="mt-6 space-y-2"><Label htmlFor="direct-date">Date</Label><Input id="direct-date" type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} className="max-w-xs" /></div>
      <div className="mt-6"><Label>Available start times</Label><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{timeSlots.map((time) => <button type="button" key={time} onClick={() => setSelectedTime(time)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all active:scale-[0.97] ${selectedTime === time ? "border-[#174a73] bg-[#174a73] text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}>{time}</button>)}</div></div>
      <div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}>Continue to details<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    </div>
  );
}

function DirectDetailsStep({ name, setName, phone, setPhone, address, setAddress, onContinue }: { name: string; setName: (value: string) => void; phone: string; setPhone: (value: string) => void; address: string; setAddress: (value: string) => void; onContinue: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Direct booking</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Where should the provider arrive?</h1><p className="mt-2 text-sm text-slate-600">These details stay with this booking and can be reused when you book the provider again.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Contact name" id="direct-name" value={name} setValue={setName} /><Field label="Phone" id="direct-phone" value={phone} setValue={setPhone} /><div className="sm:col-span-2"><Field label="Service address" id="direct-address" value={address} setValue={setAddress} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="direct-notes">Arrival or event notes</Label><Textarea id="direct-notes" defaultValue="Please check in with the event coordinator at the loading entrance." /></div></div><div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}>Review booking<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>;
}

function DirectReviewStep({ selectedTime, date, address, onContinue }: { selectedTime: string; date: string; address: string; onContinue: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Review and pay</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Confirm your booking</h1><p className="mt-2 text-sm text-slate-600">Everything important is visible before payment. The live flow would use secure Stripe checkout.</p><div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200"><ReviewRow label="Service" value="A1 — Lead Audio Engineer" /><ReviewRow label="Date and call time" value={`${formatPrototypeDate(date)} · ${selectedTime}`} /><ReviewRow label="Location" value={address} /><ReviewRow label="Service total" value="$550.00" strong /></div><div className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold">Secure payment and clear cancellation terms</p><p className="mt-1 text-xs leading-5 text-slate-500">Your card is not charged in this prototype. The live checkout would show the amount due today and policy before submission.</p></div></div><div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}><CreditCard className="mr-2 h-4 w-4" />Confirm prototype booking</Button></div></div>;
}

function DirectConfirmation({ onRestart }: { onRestart: () => void }) {
  return <div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Direct booking path</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Booking confirmed</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">The confirmation becomes the booking hub for messages, preparation, payment details, calendar actions, and later rebooking.</p><div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-3"><ConfirmationAction icon={MessageSquare} label="Message provider" /><ConfirmationAction icon={CalendarDays} label="Add to calendar" /><ConfirmationAction icon={FileText} label="View details" /></div><Button variant="outline" className="mt-7 bg-white" onClick={onRestart}><RefreshCw className="mr-2 h-4 w-4" />Restart prototype</Button></div>;
}

function QuoteProjectStep({ details, setDetails, onContinue }: { details: string; setDetails: (value: string) => void; onContinue: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Quote request</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Tell the provider about the project</h1><p className="mt-2 text-sm text-slate-600">Ask only for information needed to prepare an accurate response. No payment is collected yet.</p><div className="mt-6 space-y-2"><Label htmlFor="quote-details">What do you need?</Label><Textarea id="quote-details" className="min-h-36" value={details} onChange={(event) => setDetails(event.target.value)} /></div><button type="button" onClick={() => toast.success("Attachment added to prototype")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"><Paperclip className="h-4 w-4" />Add photos or project files</button><div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}>Add timing and location<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>;
}

function QuoteTimingStep({ date, setDate, address, setAddress, onContinue }: { date: string; setDate: (value: string) => void; address: string; setAddress: (value: string) => void; onContinue: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Quote request</p><h1 className="mt-2 text-3xl font-bold tracking-tight">When and where is the project?</h1><p className="mt-2 text-sm text-slate-600">A preferred date helps the provider respond, but it does not reserve the time until you accept the quote.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quote-date">Preferred date</Label><Input id="quote-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="quote-flexibility">Date flexibility</Label><select id="quote-flexibility" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Exact date</option><option>Within 3 days</option><option>Within 1 week</option><option>Flexible</option></select></div><div className="sm:col-span-2"><Field label="Project location" id="quote-address" value={address} setValue={setAddress} /></div></div><div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}>Review request<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>;
}

function QuoteReviewStep({ details, date, address, onContinue }: { details: string; date: string; address: string; onContinue: () => void }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Review request</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Ready for the provider</h1><p className="mt-2 text-sm text-slate-600">You are requesting a price and availability—not committing to a booking.</p><div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200"><ReviewRow label="Provider" value="Chisolm Audio" /><ReviewRow label="Project" value={details} /><ReviewRow label="Preferred date" value={formatPrototypeDate(date)} /><ReviewRow label="Location" value={address} /><ReviewRow label="Due today" value="$0.00" strong /></div><div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm text-violet-900"><p className="font-semibold">What happens next</p><p className="mt-1 text-xs leading-5 text-violet-800">The provider reviews the details, sends a price and scope, and you decide whether to accept. Accepted quotes continue into booking and payment.</p></div><div className="mt-7 flex justify-end"><Button size="lg" onClick={onContinue}><Send className="mr-2 h-4 w-4" />Submit prototype request</Button></div></div>;
}

function QuoteConfirmation({ onRestart }: { onRestart: () => void }) {
  return <div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Send className="h-7 w-7" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Quote request path</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Request sent to Chisolm Audio</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">No payment was taken and no time was reserved. The request now appears under Needs Your Action when the provider responds.</p><div className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left"><p className="text-sm font-semibold">Request OC-Q-1048</p><p className="mt-1 text-xs text-slate-500">Expected response: about 1 hour</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-1/3 rounded-full bg-violet-500" /></div><div className="mt-2 flex justify-between text-[10px] font-medium text-slate-500"><span>Sent</span><span>Provider reviewing</span><span>Quote ready</span></div></div><div className="mt-6 flex flex-wrap justify-center gap-2"><Button onClick={() => toast.info("Prototype message thread opened")}><MessageSquare className="mr-2 h-4 w-4" />Message provider</Button><Button variant="outline" className="bg-white" onClick={onRestart}><RefreshCw className="mr-2 h-4 w-4" />Restart prototype</Button></div></div>;
}

function Field({ label, id, value, setValue }: { label: string; id: string; value: string; setValue: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => setValue(event.target.value)} /></div>;
}

function ReviewRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="grid gap-1 px-4 py-4 sm:grid-cols-[150px_minmax(0,1fr)]"><span className="text-sm text-slate-500">{label}</span><span className={`text-sm sm:text-right ${strong ? "font-bold text-slate-950" : "font-medium text-slate-800"}`}>{value}</span></div>;
}

function SummaryRow({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return <div className="flex items-start gap-2.5 text-slate-600"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#156a9a]" /><span>{label}</span></div>;
}

function ConfirmationAction({ icon: Icon, label }: { icon: typeof MessageSquare; label: string }) {
  return <button type="button" onClick={() => toast.success(`${label} opened in prototype`)} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"><Icon className="mx-auto mb-2 h-5 w-5 text-[#156a9a]" />{label}</button>;
}

function formatPrototypeDate(value: string) {
  if (!value) return "Choose a date";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

