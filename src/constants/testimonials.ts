export interface Testimonial {
  name: string
  scoreBefore: number
  scoreAfter: number
  quote: string
  role: 'student' | 'parent'
  verified: boolean
}

export const TESTIMONIALS: Testimonial[] = [
  { name: "Sarah M.", scoreBefore: 1180, scoreAfter: 1380, quote: "The adaptive practice made all the difference. I could feel myself improving every week.", role: "student", verified: true },
  { name: "James K.", scoreBefore: 1340, scoreAfter: 1480, quote: "The AI explanations helped me understand concepts I'd been struggling with for months.", role: "student", verified: true },
  { name: "Maria T.", scoreBefore: 1050, scoreAfter: 1250, quote: "My daughter went from dreading SAT prep to actually looking forward to her daily practice.", role: "parent", verified: true },
  { name: "David L.", scoreBefore: 1400, scoreAfter: 1540, quote: "Better than any tutor I've tried. The questions feel just like the real test.", role: "student", verified: true },
  { name: "Priya R.", scoreBefore: 1220, scoreAfter: 1410, quote: "I improved 190 points in just 8 weeks. The personalized study plan kept me on track.", role: "student", verified: true },
  { name: "Tom W.", scoreBefore: 1100, scoreAfter: 1300, quote: "As a parent, I love seeing exactly how my son is progressing. Worth every penny.", role: "parent", verified: true },
]
