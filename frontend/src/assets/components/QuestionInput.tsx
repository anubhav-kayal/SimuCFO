import { FaWandMagicSparkles, FaArrowRight, FaRobot } from "react-icons/fa6";

interface Props {
  question: string;
  setQuestion: (q: string) => void;
  onGenerate: () => void;
}

const suggestions = [
  "What is the probability of negative cash next quarter?",
  "Run a Monte Carlo on revenue growth for FY26",
  "Analyze margin pressure with 10% cost inflation",
];

export default function QuestionInput({ question, setQuestion, onGenerate }: Props) {
  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <FaWandMagicSparkles className="text-accent text-sm" />
          <span className="text-xs font-semibold text-accent tracking-wider uppercase">AI Analysis</span>
        </div>
        <h3 className="text-lg font-semibold text-dark-900 dark:text-white">What do you want to know?</h3>
        <p className="text-sm text-dark-400 dark:text-dark-400 mt-0.5">Ask complex questions about your financial data.</p>
      </div>

      <div className="flex-1 flex flex-col">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g., "What happens to our cash position if we hire 5 engineers?"'
          className="input-field min-h-[160px] resize-none flex-1"
          rows={5}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              className="rounded-lg border border-dark-100 bg-dark-50 px-3 py-1.5 text-xs text-dark-500 transition-colors hover:border-accent hover:text-accent dark:border-dark-700 dark:bg-dark-800 dark:text-dark-400 dark:hover:border-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="btn-primary mt-5 w-full text-sm"
      >
        <FaRobot /> Generate Analysis <FaArrowRight />
      </button>
    </div>
  );
}
