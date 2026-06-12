import { useState, type ChangeEvent, type FormEvent } from "react";
import { FaPaperPlane, FaEnvelope, FaLocationDot, FaPhone } from "react-icons/fa6";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const [form, setForm] = useState<FormData>({ name: "", email: "", subject: "", message: "" });

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Contact form:", form);
    alert("Message sent! (Demo)");
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent dark:bg-accent/10 mb-4">
              Get In Touch
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-dark-900 dark:text-white mb-6">
              Let&apos;s Start a Conversation
            </h2>
            <p className="text-dark-400 dark:text-dark-300 text-lg leading-relaxed max-w-md mb-10">
              Have questions about our AI models? Need a custom Enterprise plan? Our team is ready to help.
            </p>

            <div className="space-y-6">
              {[
                { icon: FaEnvelope, title: "Email Us", detail: "hello@simucfo.com" },
                { icon: FaLocationDot, title: "Visit Us", detail: "VIT Vellore, Tamil Nadu, India" },
                { icon: FaPhone, title: "Call Us", detail: "+91 98765 43210" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dark-100 bg-white text-accent dark:border-dark-700 dark:bg-dark-850">
                      <Icon />
                    </div>
                    <div>
                      <h4 className="font-semibold text-dark-900 dark:text-white">{item.title}</h4>
                      <p className="text-sm text-dark-400 dark:text-dark-400">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-dark-500 dark:text-dark-300 ml-1">Your Name</label>
                  <input type="text" name="name" placeholder="John Doe" className="input-field mt-1" value={form.name} onChange={onChange} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-dark-500 dark:text-dark-300 ml-1">Email</label>
                  <input type="email" name="email" placeholder="john@company.com" className="input-field mt-1" value={form.email} onChange={onChange} required />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-500 dark:text-dark-300 ml-1">Subject</label>
                <input type="text" name="subject" placeholder="Enterprise Inquiry..." className="input-field mt-1" value={form.subject} onChange={onChange} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-500 dark:text-dark-300 ml-1">Message</label>
                <textarea name="message" rows={4} placeholder="Tell us about your project..." className="input-field mt-1 resize-none" value={form.message} onChange={onChange} required />
              </div>
              <button type="submit" className="btn-primary w-full">
                <FaPaperPlane /> Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
