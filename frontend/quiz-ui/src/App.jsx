import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://nutriguide-api-673231842812.us-central1.run.app";


function App() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  // "home" | "quiz" | "result"
  const [view, setView] = useState("home");

  // "customer" | "admin"
  const [mode, setMode] = useState("customer");

  // Admin analytics state
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminRecent, setAdminRecent] = useState([]);
  const [segments, setSegments] = useState(null);
  const [adminFilterProfile, setAdminFilterProfile] = useState("all");

  // ------------- DATA FETCH -------------

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/quiz/questions`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        setQuestions(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load quiz. Please check backend.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const loadAdminData = async () => {
    if (mode !== "admin") return;
    try {
      setAdminLoading(true);
      setAdminError(null);

      const [recentRes, segRes] = await Promise.all([
        fetch(`${API_BASE}/admin/recent-recommendations`),
        fetch(`${API_BASE}/admin/segments-summary`),
      ]);

      if (!recentRes.ok || !segRes.ok) {
        throw new Error("Admin API error");
      }

      const recentData = await recentRes.json();
      const segData = await segRes.json();

      setAdminRecent(recentData.items || []);
      setSegments(segData);
    } catch (err) {
      console.error(err);
      setAdminError("Failed to load admin analytics.");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "admin") {
      loadAdminData();
    }
  }, [mode]);

  // ------------- QUIZ LOGIC -------------

  const currentQuestion = questions[currentIndex];

  const handleChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${API_BASE}/quiz/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      if (!res.ok) {
        throw new Error(`Recommend API error: ${res.status}`);
      }

      const data = await res.json();
      setRecommendation(data);
      setView("result");
    } catch (err) {
      console.error(err);
      setError("Could not generate recommendation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
    setRecommendation(null);
    setView("quiz");
    setError(null);
  };

  const isLastQuestion =
    questions.length > 0 && currentIndex === questions.length - 1;

  // ------------- RENDER HELPERS -------------

  const renderQuestionInput = (question) => {
    const value = answers[question.id] ?? "";

    if (question.type === "single_choice") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {question.options?.map((opt) => {
            const selected = value === opt.id;
            return (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 999,
                  border: selected
                    ? "1.5px solid #6366f1"
                    : "1px solid #e5e7eb",
                  background: selected ? "rgba(99,102,241,0.06)" : "#ffffff",
                  boxShadow: selected
                    ? "0 8px 24px rgba(99,102,241,0.25)"
                    : "0 2px 6px rgba(15,23,42,0.04)",
                  cursor: "pointer",
                  transition:
                    "background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.id}
                  checked={selected}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: "#111827" }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.type === "multi_choice") {
      const arrValue = Array.isArray(value) ? value : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {question.options?.map((opt) => {
            const checked = arrValue.includes(opt.id);
            return (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: checked
                    ? "1.5px solid #6366f1"
                    : "1px solid #e5e7eb",
                  background: checked ? "rgba(99,102,241,0.06)" : "#ffffff",
                  boxShadow: checked
                    ? "0 8px 24px rgba(99,102,241,0.25)"
                    : "0 2px 6px rgba(15,23,42,0.04)",
                  cursor: "pointer",
                  transition:
                    "background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const newValue = checked
                      ? arrValue.filter((v) => v !== opt.id)
                      : [...arrValue, opt.id];
                    handleChange(question.id, newValue);
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: "#111827" }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.type === "number") {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(question.id, e.target.value)}
          style={{
            padding: "10px 12px",
            width: "100%",
            maxWidth: 260,
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            fontSize: 14,
          }}
        />
      );
    }

    // text
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => handleChange(question.id, e.target.value)}
        style={{
          padding: 10,
          width: "100%",
          maxWidth: 420,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          fontSize: 14,
        }}
        placeholder="Type your answer…"
      />
    );
  };

  // ---------- LANDING PAGE ----------
  const renderHome = () => {
    return (
      <div
        style={{
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background:
            "radial-gradient(circle at top left, #f9fafb 0, #e5e7eb 40%, #f9fafb 100%)",
        }}
      >
        {/* NAVBAR */}
        <header
          style={{
            maxWidth: "100%",
            margin: "0 auto",
            padding: "20px 80px 8px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  fontSize: 18,
                }}
              >
                NutriGuide
              </div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#6b7280",
                }}
              >
                Daily nutrition, simplified
              </div>
            </div>
          </div>

          <nav
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <button
              onClick={() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#4b5563",
              }}
            >
              How it works
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("science")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#4b5563",
              }}
            >
              Science
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("reviews")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#4b5563",
              }}
            >
              Parents
            </button>

            <button
              onClick={() => setMode("admin")}
              style={{
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                padding: "6px 12px",
                fontSize: 12,
                background: "#ffffff",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              Admin
            </button>

            <button
              onClick={() => setView("quiz")}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 12px 30px rgba(236,72,153,0.35)",
              }}
            >
              Take quiz
            </button>
          </nav>
        </header>

        {/* HERO */}
        <main
          style={{
            maxWidth: "100%",
            margin: "0 auto",
            padding: "40px 80px 80px",
            boxSizing: "border-box",
          }}
        >
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
              gap: 56,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#e0f2fe",
                  fontSize: 11,
                  color: "#0369a1",
                  marginBottom: 16,
                }}
              >
                <span>✨ AI-guided daily nutrition</span>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#0ea5e9",
                  }}
                />
              </div>

              <h1
                style={{
                  fontSize: 38,
                  lineHeight: 1.1,
                  marginBottom: 16,
                  color: "#0f172a",
                }}
              >
                Build a vitamin routine that fits{" "}
                <span style={{ color: "#6366f1" }}>your real life</span>.
              </h1>

              <p
                style={{
                  fontSize: 16,
                  color: "#4b5563",
                  maxWidth: 520,
                  marginBottom: 20,
                }}
              >
                In 2 minutes, our quiz learns about your family’s lifestyle,
                diets, and goals — then builds a science-backed bundle you’ll
                actually remember to take.
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <button
                  onClick={() => setView("quiz")}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      "linear-gradient(135deg, #6366f1, #ec4899)",
                    color: "#fff",
                    fontSize: 15,
                    cursor: "pointer",
                    boxShadow: "0 18px 40px rgba(79,70,229,0.45)",
                  }}
                >
                  Start your quiz
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#4b5563",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  See how it works
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 20,
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  ⭐⭐⭐⭐⭐ <strong>4.9</strong> average rating from parents
                </div>
                <div>Backed by nutritionists & pediatricians</div>
              </div>
            </div>

            {/* Right hero "product" card */}
            <div
              style={{
                position: "relative",
                padding: 24,
                borderRadius: 28,
                background:
                  "radial-gradient(circle at top, #eff6ff 0, #eef2ff 40%, #ffffff 100%)",
                boxShadow: "0 26px 60px rgba(148,163,184,0.6)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -40,
                  background:
                    "radial-gradient(circle at top left, rgba(236,72,153,0.2), transparent 60%)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 180,
                    height: 220,
                    borderRadius: 999,
                    background:
                      "linear-gradient(160deg, #6366f1, #a855f7)",
                    margin: "0 auto 12px",
                  }}
                />
                <h3
                  style={{
                    textAlign: "center",
                    margin: "4px 0 4px",
                    fontSize: 18,
                  }}
                >
                  Your daily bundle
                </h3>
                <p
                  style={{
                    textAlign: "center",
                    margin: 0,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  Built from 15+ possible products, tailored to your quiz
                  answers.
                </p>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Adult Daily</div>
                    <div style={{ color: "#6b7280" }}>
                      Core multivitamin matched to your age group.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      Probiotic + Prebiotic
                    </div>
                    <div style={{ color: "#6b7280" }}>
                      Supports digestion, immunity & gut health.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Iron + B12 Booster</div>
                    <div style={{ color: "#6b7280" }}>
                      For energy, focus & healthy red blood cells.
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: "#eff6ff",
                      border: "1px dashed #93c5fd",
                    }}
                  >
                    <div style={{ color: "#1d4ed8" }}>
                      + Personalized add-ons based on your quiz.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section
            id="how-it-works"
            style={{ marginTop: 64, marginBottom: 32 }}
          >
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>How NutriGuide works</h2>
            <p style={{ color: "#4b5563", fontSize: 14, marginBottom: 20 }}>
              No generic bundles. We match products to your profile, goals, and
              lifestyle — then explain every recommendation in plain English.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  title: "1. Take the quiz",
                  body: "Tell us who you’re shopping for, diet, lifestyle, goals, and any allergies.",
                },
                {
                  title: "2. See your bundle",
                  body: "We score products behind the scenes and build a core bundle + optional add-ons.",
                },
                {
                  title: "3. Read the ‘why’",
                  body: "An AI-nutritionist explains why each product was chosen, in everyday language.",
                },
              ].map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 8px 24px rgba(148,163,184,0.18)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background:
                        "linear-gradient(135deg, #6366f1, #ec4899)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 14,
                      marginBottom: 10,
                    }}
                  >
                    {i + 1}
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SCIENCE SECTION */}
          <section id="science" style={{ marginTop: 48, marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>
              Backed by research, explained by AI
            </h2>
            <p style={{ fontSize: 14, color: "#4b5563", maxWidth: 620 }}>
              NutriGuide doesn’t replace your doctor. It helps you ask smarter
              questions. We map your answers to ingredient research, age-specific
              needs, and common gaps — then flag any combinations you should
              double-check with a professional.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <strong>Smart safety notes</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563" }}>
                  The bundle view highlights potential conflicts or “talk to your
                  doctor” moments for peace of mind.
                </p>
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <strong>No one-size-fits-all</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563" }}>
                  Different life stages, different goals. The quiz picks a
                  starting point for your unique routine.
                </p>
              </div>
              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <strong>Transparent scoring</strong>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563" }}>
                  Every product has a fit score so you can see which items are
                  “must-haves” vs “nice-to-haves”.
                </p>
              </div>
            </div>
          </section>

          {/* REVIEWS PREVIEW */}
          <section id="reviews" style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>
              Parents using NutriGuide say…
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {[
                "“I finally understand why each vitamin is in our routine. The explanation feels like a friendly nutritionist.”",
                "“We used to guess at the supplement aisle. Now I have a clear, personalized plan — and I can share the notes with our pediatrician.”",
                "“Love that I can tweak our goals and instantly see how the bundle changes. It feels like having an AI co-pilot for health decisions.”",
              ].map((quote, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 8px 20px rgba(148,163,184,0.18)",
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  {quote}
                </div>
              ))}
            </div>
          </section>

          {/* CTA STRIP */}
          <section
            style={{
              marginTop: 56,
              padding: 18,
              borderRadius: 18,
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Ready in under 2 minutes.
              </div>
            </div>
            <button
              onClick={() => setView("quiz")}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: "#ffffff",
                color: "#111827",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Start the quiz
            </button>
          </section>
        </main>

        {/* FOOTER */}
        <footer
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "16px 24px",
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          NutriGuide is not a medical device and does not provide medical
          advice. Always consult your doctor or pediatrician before making
          changes to your supplement routine.
        </footer>
      </div>
    );
  };

  // ---------- ADMIN VIEW ----------
  const renderAdminView = () => {
    const filteredRecent =
      adminFilterProfile === "all"
        ? adminRecent
        : adminRecent.filter(
            (rec) => rec.profile_type === adminFilterProfile
          );

    return (
      <div
        style={{
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background:
            "radial-gradient(circle at top left, #1f2937 0, #020617 50%, #020617 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 32,
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(17,24,39,0.98))",
            border: "1px solid rgba(148,163,184,0.35)",
            padding: 24,
            borderRadius: 22,
            boxShadow: "0 24px 60px rgba(15,23,42,0.7)",
            width: "100%",
            maxWidth: 960,
            color: "#e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22 }}>Admin dashboard</h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 13 }}>
                <label style={{ marginRight: 4 }}>Profile:</label>
                <select
                  value={adminFilterProfile}
                  onChange={(e) => setAdminFilterProfile(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "#020617",
                    color: "#e5e7eb",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All</option>
                  {segments?.by_profile_type &&
                    Object.keys(segments.by_profile_type).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
              </div>

              <button
                onClick={loadAdminData}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #4b5563",
                  background: "#020617",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#e5e7eb",
                }}
              >
                Refresh ↻
              </button>

              <button
                onClick={() => setMode("customer")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg, #6366f1, #ec4899)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Back to site
              </button>
            </div>
          </div>

          {adminLoading && <p>Loading analytics…</p>}
          {adminError && (
            <p style={{ color: "#fecaca", marginBottom: 12 }}>
              {adminError}
            </p>
          )}

          {segments && !adminLoading && (
            <>
              <h2 style={{ marginTop: 8, fontSize: 18 }}>Overview</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Total recommendations
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {segments.total_recommendations}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Avg bundle price
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>
                    {segments.avg_bundle_price != null
                      ? `$${segments.avg_bundle_price.toFixed(2)}`
                      : "—"}
                  </div>
                  {segments.avg_products_per_bundle != null && (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      Avg products per bundle:{" "}
                      {segments.avg_products_per_bundle.toFixed
                        ? segments.avg_products_per_bundle.toFixed(1)
                        : segments.avg_products_per_bundle}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Avg subscription net price
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>
                    {segments.avg_sub_price != null
                      ? `$${segments.avg_sub_price.toFixed(2)}`
                      : "—"}
                  </div>
                  {segments.avg_discount_pct != null && (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      Avg discount: {segments.avg_discount_pct}% off
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Top profile types
                  </div>
                  {segments.by_profile_type &&
                    Object.entries(segments.by_profile_type).map(
                      ([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          {k}: {v}
                        </div>
                      )
                    )}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginBottom: 4,
                    }}
                  >
                    Top products
                  </div>
                  {segments.product_counts &&
                    Object.entries(segments.product_counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: 13 }}>
                          {k}: {v}
                        </div>
                      ))}
                </div>
              </div>
            </>
          )}

          {/* Recent recommendations table */}
          <h2 style={{ marginTop: 16, fontSize: 18 }}>Recent recommendations</h2>
          {(!filteredRecent || filteredRecent.length === 0) && !adminLoading ? (
            <p style={{ fontSize: 14, color: "#9ca3af" }}>
              No recommendations logged yet for this filter. Complete the quiz a
              few times to populate this view.
            </p>
          ) : (
            <div
              style={{
                maxHeight: 400,
                overflow: "auto",
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead
                  style={{
                    background: "#020617",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={{ padding: 8, textAlign: "left" }}>
                      Time (UTC)
                    </th>
                    <th style={{ padding: 8, textAlign: "left" }}>Profile</th>
                    <th style={{ padding: 8, textAlign: "left" }}>
                      Age group
                    </th>
                    <th style={{ padding: 8, textAlign: "left" }}>Goals</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Products</th>
                    <th style={{ padding: 8, textAlign: "left" }}>Upsell</th>
                    <th style={{ padding: 8, textAlign: "right" }}>
                      Bundle $
                    </th>
                    <th style={{ padding: 8, textAlign: "right" }}>
                      Sub $
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.map((rec, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderTop: "1px solid rgba(55,65,81,0.7)",
                        background: idx % 2 ? "#020617" : "#030712",
                      }}
                    >
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {rec.timestamp}
                      </td>
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {rec.profile_type || "—"}
                      </td>
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {rec.age_group || "—"}
                      </td>
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {(rec.goals || []).join(", ") || "—"}
                      </td>
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {(rec.products || []).join(", ") || "—"}
                      </td>
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {(rec.upsell || []).join(", ") || "—"}
                      </td>
                      <td
                        style={{
                          padding: 8,
                          textAlign: "right",
                          verticalAlign: "top",
                        }}
                      >
                        {typeof rec.bundle_price === "number"
                          ? `$${rec.bundle_price.toFixed(2)}`
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: 8,
                          textAlign: "right",
                          verticalAlign: "top",
                        }}
                      >
                        {typeof rec.bundle_price_subscription === "number"
                          ? `$${rec.bundle_price_subscription.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------- RESULT VIEW ----------
  const renderResultView = () => {
    if (!recommendation) return null;

    const {
      products = [],
      upsell = [],
      explanation = [],
      bundle_summary,
      product_details = [],
      llm_explanation,
      safety_notes = [],
      pricing,
    } = recommendation;

    const hasDetails = product_details && product_details.length > 0;

    const bundlePrice = pricing?.bundle_price;
    const bundleSubPrice = pricing?.bundle_price_subscription;
    const bundleSubSavePct = pricing?.subscription_savings_pct;

    return (
      <div
        style={{
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background:
            "radial-gradient(circle at top left, #f9fafb 0, #e5e7eb 40%, #f9fafb 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 32,
        }}
      >
        <div
          style={{
            background: "#f9fafb",
            padding: 24,
            borderRadius: 22,
            boxShadow: "0 26px 60px rgba(15,23,42,0.3)",
            width: "100%",
            maxWidth: 720,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <h1 style={{ margin: 0 }}>Your personalized bundle</h1>
            <button
              onClick={() => setMode("admin")}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #6366f1, #ec4899)",
                cursor: "pointer",
                fontSize: 13,
                color: "#fff",
              }}
            >
              Admin
            </button>
          </div>

          {bundle_summary && (
            <p style={{ marginTop: 0, marginBottom: 8, color: "#4b5563" }}>
              {bundle_summary}
            </p>
          )}

          {pricing && (
            <p style={{ marginTop: 0, marginBottom: 16, color: "#111827" }}>
              <strong>
                Total:{" "}
                {bundlePrice != null
                  ? `$${bundlePrice.toFixed(2)}`
                  : "—"}
              </strong>{" "}
              {bundleSubPrice != null && (
                <>
                  •{" "}
                  <span>
                    Subscribe &amp; save: {`$${bundleSubPrice.toFixed(2)} `}
                    {bundleSubSavePct > 0 && (
                      <span>({bundleSubSavePct}% off)</span>
                    )}
                  </span>
                </>
              )}
            </p>
          )}

          {llm_explanation && (
            <div
              style={{
                background: "#eef2ff",
                borderRadius: 14,
                padding: 12,
                marginBottom: 16,
                border: "1px solid #e5e7eb",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {llm_explanation}
            </div>
          )}

          {Array.isArray(safety_notes) && safety_notes.length > 0 && (
            <div
              style={{
                background: "#fef2f2",
                borderRadius: 14,
                padding: 12,
                marginBottom: 16,
                border: "1px solid #fecaca",
                fontSize: 13,
                color: "#991b1b",
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>
                ⚠ Safety notes
              </strong>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {safety_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
              <p style={{ marginTop: 8 }}>
                These notes are informational only and do not replace medical
                advice. Please review with your doctor or pediatrician if you
                have any concerns.
              </p>
            </div>
          )}

          <h3>Core products</h3>

          {hasDetails ? (
            <div style={{ marginBottom: 8 }}>
              {product_details.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    marginBottom: 8,
                    background: idx === 0 ? "#eef2ff" : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <strong>{p.name}</strong>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#f3f4f6",
                        }}
                      >
                        Fit score: {p.score}/100
                      </span>
                      {typeof p.price_usd === "number" && (
                        <span
                          style={{
                            fontSize: 11,
                            marginLeft: 4,
                            color: "#6b7280",
                          }}
                        >
                          ${p.price_usd.toFixed(2)}/month · ~$
                          {p.price_per_day?.toFixed
                            ? p.price_per_day.toFixed(2)
                            : p.price_per_day}
                          /day
                        </span>
                      )}
                    </div>
                  </div>
                  {p.reasons && p.reasons.length > 0 && (
                    <ul
                      style={{ marginTop: 4, paddingLeft: 20, fontSize: 13 }}
                    >
                      {p.reasons.slice(0, 2).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {products.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          {upsell.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Optional add-ons</h3>
              <ul style={{ paddingLeft: 20 }}>
                {upsell.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </>
          )}

          {explanation.length > 0 && (
            <>
              <h3 style={{ marginTop: 16 }}>Why we chose these</h3>
              <ul style={{ paddingLeft: 20 }}>
                {explanation.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
            <button
              onClick={handleRestart}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Adjust my answers
            </button>
            <button
              onClick={() => setView("home")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "#ffffff",
                boxShadow: "0 6px 18px rgba(148,163,184,0.4)",
                cursor: "pointer",
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---------- ROUTING-LIKE SWITCH ----------

  if (mode === "admin") {
    return renderAdminView();
  }

  if (view === "home") {
    return renderHome();
  }

  if (view === "result") {
    return renderResultView();
  }

  // ---------- QUIZ VIEW ----------
  if (loading) {
    return <div style={{ padding: 20 }}>Loading quiz…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        {error}
      </div>
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: 20 }}>No questions available.</div>;
  }

  const totalQuestions = questions.length || 1;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top left, #f9fafb 0, #e5e7eb 40%, #f9fafb 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 32,
      }}
    >
      <div
        style={{
          background: "#f9fafb",
          padding: 24,
          borderRadius: 22,
          boxShadow: "0 26px 60px rgba(15,23,42,0.3)",
          width: "100%",
          maxWidth: 720,
        }}
      >
        {/* Header with Admin + Home link */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <button
              onClick={() => setView("home")}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
              }}
            >
              <h1 style={{ margin: 0 }}>NutriGuide Quiz</h1>
            </button>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Answer a few quick questions so we can personalize supplement
              recommendations.
            </p>
          </div>
          <button
            onClick={() => setMode("admin")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #6366f1, #ec4899)",
              cursor: "pointer",
              fontSize: 13,
              color: "#fff",
            }}
          >
            Admin
          </button>
        </div>

        {/* progress bar */}
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background:
                  "linear-gradient(135deg, #6366f1, #ec4899)",
                transition: "width 0.2s ease-out",
              }}
            />
          </div>
        </div>

        <h2 style={{ marginBottom: 8 }}>{currentQuestion.text}</h2>
        {currentQuestion.help_text && (
          <p style={{ marginTop: 0, marginBottom: 16, color: "#6b7280" }}>
            {currentQuestion.help_text}
          </p>
        )}

        {renderQuestionInput(currentQuestion)}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24,
          }}
        >
          <button
            onClick={handleBack}
            disabled={currentIndex === 0 || submitting}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background:
                currentIndex === 0 || submitting ? "#e5e7eb" : "#f3f4f6",
              cursor:
                currentIndex === 0 || submitting ? "default" : "pointer",
              fontSize: 14,
            }}
          >
            Back
          </button>

          {!isLastQuestion && (
            <button
              onClick={handleNext}
              disabled={submitting}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #6366f1, #ec4899)",
                color: "white",
                cursor: submitting ? "default" : "pointer",
                fontSize: 14,
                boxShadow: "0 12px 30px rgba(236,72,153,0.35)",
              }}
            >
              Next
            </button>
          )}

          {isLastQuestion && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #6366f1, #ec4899)",
                color: "white",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
                fontSize: 14,
                boxShadow: "0 12px 30px rgba(236,72,153,0.35)",
              }}
            >
              {submitting ? "Generating…" : "See my bundle"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
