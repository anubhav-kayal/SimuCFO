import React, { useState } from 'react';
import { FaPaperPlane, FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This is where EmailJS logic will go later
    console.log("Form Submitted", formData);
    alert("Message sent! (This is a demo)");
  };

  return (
    <section id="contact" className="py-24 px-[5%] bg-[#f8f9ff] font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-200 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Column: Contact Info */}
        <div className="space-y-8 z-10">
            <div>
                <h2 className="text-[#8c52ff] font-bold tracking-widest text-sm uppercase mb-2">GET IN TOUCH</h2>
                <h2 className="text-4xl md:text-5xl font-extrabold text-[#1a1a1a] tracking-tight mb-6">
                    Let's Start a Conversation
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                    Have questions about our AI models? Need a custom Enterprise plan? Our team is ready to help you transform your financial strategy.
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#8c52ff] flex-shrink-0">
                        <FaEnvelope />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Email Us</h4>
                        <p className="text-gray-500">hello@simucfo.com</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#8c52ff] flex-shrink-0">
                        <FaMapMarkerAlt />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Visit Us</h4>
                        <p className="text-gray-500">VIT Vellore, Tamil Nadu, India</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#8c52ff] flex-shrink-0">
                        <FaPhoneAlt />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Call Us</h4>
                        <p className="text-gray-500">+91 98765 43210</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: The Form */}
        <div className="bg-white p-10 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-gray-100 z-10">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Your Name</label>
                        <input 
                            type="text" 
                            name="name"
                            placeholder="John Doe" 
                            className="w-full px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#8c52ff] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            name="email"
                            placeholder="john@company.com" 
                            className="w-full px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#8c52ff] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Subject</label>
                    <input 
                        type="text" 
                        name="subject"
                        placeholder="Enterprise Inquiry..." 
                        className="w-full px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#8c52ff] focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Message</label>
                    <textarea 
                        name="message"
                        placeholder="Tell us about your project..." 
                        rows={4}
                        className="w-full px-6 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#8c52ff] focus:ring-2 focus:ring-purple-100 outline-none transition-all resize-none"
                        value={formData.message}
                        onChange={handleChange}
                        required
                    ></textarea>
                </div>

                <button 
                    type="submit" 
                    className="w-full py-4 bg-[#8c52ff] text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(140,82,255,0.3)] hover:shadow-[0_15px_30px_rgba(140,82,255,0.4)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                    Send Message <FaPaperPlane />
                </button>

            </form>
        </div>

      </div>
    </section>
  );
};

export default Contact;