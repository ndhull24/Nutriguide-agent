import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [view, setView] = useState("quiz"); // "quiz" | "result"

  // NEW: content assistant state
  const [emailCopy, setEmailCopy] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);

  // Admin mode + admin data
  const [mode, setMode] = useState("customer"); // "customer" | "admin"

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);
  const [adminRecent, setAdminRecent] = useState([]);
  const [segments, setSegments] = useState(null);

  // Filter state for admin
  const [adminFilterProfile, setAdminFilterProfile] = useState("all");

  // Load quiz questions
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

  // Helper to load admin data (used by effect + Refresh button)
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

  // Load admin data whenever we switch into admin mode
  useEffect(() => {
    if (mode === "admin") {
      loadAdminData();
    }
  }, [mode]);

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

      console.log("Collected answers:", answers);

      const res = await fetch(`${API_BASE}/quiz/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      if (!res.ok) {
        throw new Error(`Recommend API error: ${res.status}`);
      }

      const data = await res.json();
      console.log("Recommendation:", data);

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
    // reset email state as well
    setEmailCopy(null);
    setEmailError(null);
    setEmailLoading(false);
  };

  const isLastQuestion = currentIndex === questions.length - 1;

  const renderQuestionInput = (question) => {
    const value = answers[question.id] ?? "";

    if (question.type === "single_choice") {
      return (
        <div>
          {question.options?.map((opt) => (
            <label key={opt.id} style={{ display: "block", marginBottom: 8 }}>
              <input
                type="radio"
                name={question.id}
                value={opt.id}
                checked={value === opt.id}
                onChange={(e) => handleChange(question.id, e.target.value)}
              />
              <span style={{ marginLeft: 8 }}>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    }

    if (question.type === "multi_choice") {
      const arrValue = Array.isArray(value) ? value : [];
      return (
        <div>
          {question.options?.map((opt) => {
            const checked = arrValue.includes(opt.id);
            return (
              <label key={opt.id} style={{ display: "block", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const newValue = checked
                      ? arrValue.filter((v) => v !== opt.id)
                      : [...arrValue, opt.id];
                    handleChange(question.id, newValue);
                  }}
                />
                <span style={{ marginLeft: 8 }}>{opt.label}</span>
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
          style={{ padding: 8, width: "100%", maxWidth: 300 }}
        />
      );
    }

    // text
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => handleChange(question.id, e.target.value)}
        style={{ padding: 8, width: "100%", maxWidth: 400 }}
        placeholder="Type your answer…"
      />
    );
  };

  // NEW: handler to call content/welcome-email endpoint
  const handleGenerateEmailCopy = async () => {
    try {
      setEmailLoading(true);
      setEmailError(null);
      setEmailCopy(null);

      const res = await fetch(`${API_BASE}/content/welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: answers,
          recommendation: recommendation,
        }),
      });

      if (!res.ok) {
        throw new Error(`Content API error: ${res.status}`);
      }

      const data = await res.json();
      setEmailCopy(data);
    } catch (err) {
      console.error(err);
      setEmailError("Could not generate engagement content.");
    } finally {
      setEmailLoading(false);
    }
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
          background: "#f6f7fb",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: 40,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: 24,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            width: "100%",
            maxWidth: 900,
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
            <h1 style={{ margin: 0 }}>Admin dashboard</h1>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {/* Filter by profile type */}
              <div style={{ fontSize: 13 }}>
                <label style={{ marginRight: 4 }}>Profile:</label>
                <select
                  value={adminFilterProfile}
                  onChange={(e) => setAdminFilterProfile(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
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
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Refresh ↻
              </button>

              <button
                onClick={() =>
                  window.open(`${API_BASE}/admin/export-recent`, "_blank")
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: "#f3f4ff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Export CSV
              </button>

              <button
                onClick={() => setMode("customer")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Back to quiz
              </button>
            </div>
          </div>

          {adminLoading && <p>Loading analytics…</p>}
          {adminError && (
            <p style={{ color: "red", marginBottom: 12 }}>{adminError}</p>
          )}

          {/* Segments summary */}
          {segments && !adminLoading && (
            <>
              <h2 style={{ marginTop: 8 }}>Overview</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {/* Total recommendations */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Total recommendations
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {segments.total_recommendations}
                  </div>
                </div>

                {/* Avg bundle price */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
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
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Avg products per bundle:{" "}
                      {segments.avg_products_per_bundle.toFixed
                        ? segments.avg_products_per_bundle.toFixed(1)
                        : segments.avg_products_per_bundle}
                    </div>
                  )}
                </div>

                {/* Avg subscription discount */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
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
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Avg discount: {segments.avg_discount_pct}% off
                    </div>
                  )}
                </div>

                {/* Top profile types */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
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

                {/* Top products */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
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

                {/* Risk distribution */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    Risk distribution
                  </div>
                  {segments.by_risk_label &&
                    Object.entries(segments.by_risk_label).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 13 }}>
                        {k}: {v}
                      </div>
                    ))}
                  {segments.high_risk_share != null && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 4,
                      }}
                    >
                      High-risk share: {segments.high_risk_share}% of all
                      bundles
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Recent recommendations table */}
          <h2 style={{ marginTop: 16 }}>Recent recommendations</h2>
          {(!filteredRecent || filteredRecent.length === 0) && !adminLoading ? (
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              No recommendations logged yet for this filter. Complete the quiz a
              few times to populate this view.
            </p>
          ) : (
            <div
              style={{
                maxHeight: 400,
                overflow: "auto",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
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
                    background: "#f9fafb",
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
                    <th style={{ padding: 8, textAlign: "left" }}>Risk</th>
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
                        borderTop: "1px solid #e5e7eb",
                        background: idx % 2 ? "#fff" : "#f9fafb",
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

                      {/* NEW: risk cell */}
                      <td style={{ padding: 8, verticalAlign: "top" }}>
                        {rec.risk_label || "—"}
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

  // If we're in admin mode, show admin dashboard instead of quiz/result
  if (mode === "admin") {
    return renderAdminView();
  }

  // ---------- RESULT VIEW ----------
  if (view === "result" && recommendation) {
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
          background: "#f6f7fb",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: 40,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: 24,
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            width: "100%",
            maxWidth: 640,
          }}
        >
          {/* Header with Admin button */}
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
                background: "#e5e7eb",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Admin
            </button>
          </div>

          {bundle_summary && (
            <p style={{ marginTop: 0, marginBottom: 8, color: "#555" }}>
              {bundle_summary}
            </p>
          )}

          {pricing && (
            <p style={{ marginTop: 0, marginBottom: 16, color: "#111827" }}>
              <strong>
                Total:{" "}
                {bundlePrice != null ? `$${bundlePrice.toFixed(2)}` : "—"}
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

          {/* LLM / nutritionist-style explanation */}
          {llm_explanation && (
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 12,
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

          {/* Safety notes */}
          {Array.isArray(safety_notes) && safety_notes.length > 0 && (
            <div
              style={{
                background: "#fef2f2",
                borderRadius: 12,
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
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    marginBottom: 8,
                    background: idx === 0 ? "#eef2ff" : "#fff",
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

          {/* Engagement content / email copy */}
          <div style={{ marginTop: 24 }}>
            <h3>Engagement content</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              Use this as a starting point for an email, SMS, or in-app message
              to explain the bundle to a customer.
            </p>

            <button
              onClick={handleGenerateEmailCopy}
              disabled={emailLoading}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: emailLoading ? "default" : "pointer",
                fontSize: 13,
                marginBottom: 12,
                marginTop: 8,
              }}
            >
              {emailLoading ? "Generating..." : "Generate email copy"}
            </button>

            {emailError && (
              <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>
                {emailError}
              </p>
            )}

            {emailCopy && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <strong>Subject:</strong> {emailCopy.subject}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Preview:</strong> {emailCopy.preview_line}
                </div>
                <div>
                  <strong>Body:</strong>
                  <div style={{ marginTop: 4 }}>{emailCopy.body_text}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleRestart}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "#eee",
                cursor: "pointer",
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
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

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#f6f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 640,
        }}
      >
        {/* Header with Admin button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h1 style={{ margin: 0 }}>NutriGuide Quiz</h1>
          <button
            onClick={() => setMode("admin")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Admin
          </button>
        </div>

        <p style={{ marginBottom: 24, color: "#555" }}>
          Answer a few quick questions so we can personalize supplement
          recommendations.
        </p>

        <div style={{ marginBottom: 16, fontSize: 14, color: "#777" }}>
          Question {currentIndex + 1} of {questions.length}
        </div>

        <h2 style={{ marginBottom: 12 }}>{currentQuestion.text}</h2>
        {currentQuestion.help_text && (
          <p style={{ marginTop: 0, marginBottom: 12, color: "#777" }}>
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
                currentIndex === 0 || submitting ? "#ddd" : "#eee",
              cursor:
                currentIndex === 0 || submitting ? "default" : "pointer",
            }}
          >
            Back
          </button>

          {!isLastQuestion && (
            <button
              onClick={handleNext}
              disabled={submitting}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "#111827",
                color: "white",
                cursor: submitting ? "default" : "pointer",
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
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #4f46e5, #ec4899)",
                color: "white",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Generating…" : "Finish Quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
