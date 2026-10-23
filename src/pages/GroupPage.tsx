import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Debt, Group } from "../types";
import { useCurrentUser, signOut } from "../lib/auth";
import {
  addDebt as dbAddDebt,
  addMember as dbAddMember,
  getFullGroup,
  recordDebtPayment as dbRecordDebtPayment,
} from "../lib/db";
import {
  buildSplitDebts,
  computeDebtBetween,
  computeGroupPendingTotals,
  computeMutualDebt,
  computePersonalBalances,
  currencySymbol,
  fmt,
  formatCreatedAt,
} from "../lib/utils";
import { baseCard, C } from "../components/design";
import { Avatar, Btn, Input, StyledSelect } from "../components/ui";
import versionInfo from "../data/version.json";

interface DebtAmountByCurrency {
  currency: string;
  amount: number;
}

interface DebtByLender {
  lenderId: string;
  lenderName: string;
  amounts: DebtAmountByCurrency[];
}

interface DebtByDebtor {
  debtorId: string;
  debtorName: string;
  amounts: DebtAmountByCurrency[];
}

function computeMemberDebtBreakdown(group: Group, memberId: string | undefined) {
  const totals = new Map<string, number>();
  const lenderTotals = new Map<string, Map<string, number>>();

  if (memberId) {
    for (const debt of group.debts) {
      if (debt.debtorId !== memberId || debt.status === "pagada") continue;
      const remaining = Math.max(0, debt.amount - debt.paidAmount);
      if (remaining === 0) continue;

      totals.set(debt.currency, (totals.get(debt.currency) ?? 0) + remaining);
      const amounts = lenderTotals.get(debt.lenderId) ?? new Map<string, number>();
      amounts.set(debt.currency, (amounts.get(debt.currency) ?? 0) + remaining);
      lenderTotals.set(debt.lenderId, amounts);
    }
  }

  const toAmounts = (amounts: Map<string, number>): DebtAmountByCurrency[] =>
    [...amounts].map(([currency, amount]) => ({ currency, amount }));

  return {
    totals: toAmounts(totals),
    lenders: group.members.reduce<DebtByLender[]>((result, member) => {
      const amounts = lenderTotals.get(member.id);
      if (amounts) {
        result.push({
          lenderId: member.id,
          lenderName: member.name,
          amounts: toAmounts(amounts),
        });
      }
      return result;
    }, []),
  };
}

function computeMemberReceivableBreakdown(
  group: Group,
  memberId: string | undefined,
) {
  const totals = new Map<string, number>();
  const debtorTotals = new Map<string, Map<string, number>>();

  if (memberId) {
    for (const debt of group.debts) {
      if (debt.lenderId !== memberId || debt.status === "pagada") continue;
      const remaining = Math.max(0, debt.amount - debt.paidAmount);
      if (remaining === 0) continue;

      totals.set(debt.currency, (totals.get(debt.currency) ?? 0) + remaining);
      const amounts = debtorTotals.get(debt.debtorId) ?? new Map<string, number>();
      amounts.set(debt.currency, (amounts.get(debt.currency) ?? 0) + remaining);
      debtorTotals.set(debt.debtorId, amounts);
    }
  }

  const toAmounts = (amounts: Map<string, number>): DebtAmountByCurrency[] =>
    [...amounts].map(([currency, amount]) => ({ currency, amount }));

  return {
    totals: toAmounts(totals),
    debtors: group.members.reduce<DebtByDebtor[]>((result, member) => {
      const amounts = debtorTotals.get(member.id);
      if (amounts) {
        result.push({
          debtorId: member.id,
          debtorName: member.name,
          amounts: toAmounts(amounts),
        });
      }
      return result;
    }, []),
  };
}

function BalanceBreakdown({
  totals,
  parties,
  totalLabel,
  listLabel,
  partyAriaPrefix,
  emptyMessage,
  accentColor,
  accentBackground,
}: {
  totals: DebtAmountByCurrency[];
  parties: { id: string; name: string; amounts: DebtAmountByCurrency[] }[];
  totalLabel: string;
  listLabel: string;
  partyAriaPrefix: string;
  emptyMessage: string;
  accentColor: string;
  accentBackground: string;
}) {
  if (totals.length === 0) {
    return (
      <div
        style={{
          borderRadius: 12,
          background: C.greenLo,
          color: C.green,
          padding: 18,
          textAlign: "center",
          fontWeight: 800,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section
        aria-label={totalLabel}
        style={{
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          background: accentBackground,
          padding: 16,
        }}
      >
        <div
          style={{
            color: C.text2,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          {totalLabel}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {totals.map(({ currency, amount }) => (
            <div
              key={currency}
              style={{
                color: accentColor,
                fontSize: 24,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {currencySymbol(currency)}{fmt(amount)} {currency}
            </div>
          ))}
        </div>
      </section>

      <div>
        <div
          style={{
            color: C.text2,
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          {listLabel}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {parties.map((party) => (
            <section
              key={party.id}
              aria-label={`${partyAriaPrefix} ${party.name}`}
              style={{
                alignItems: "center",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar name={party.name} size={30} />
                <span style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>
                  {party.name}
                </span>
              </div>
              <div style={{ display: "grid", gap: 4, textAlign: "right" }}>
                {party.amounts.map(({ currency, amount }) => (
                  <span
                    key={currency}
                    style={{
                      color: accentColor,
                      fontSize: 14,
                      fontWeight: 850,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {currencySymbol(currency)}{fmt(amount)} {currency}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonalBalanceCard({
  label,
  totals,
  accentColor,
  accentBackground,
  onClick,
}: {
  label: string;
  totals: DebtAmountByCurrency[];
  accentColor: string;
  accentBackground: string;
  onClick: (trigger: HTMLButtonElement) => void;
}) {
  const displayedTotals =
    totals.length > 0 ? totals : [{ currency: "CRC", amount: 0 }];

  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => onClick(event.currentTarget)}
      style={{
        background: accentBackground,
        border: `1px solid ${C.border2}`,
        borderRadius: 14,
        color: C.text,
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: 126,
        padding: 18,
        textAlign: "left",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 850 }}>{label}</span>
        <span style={{ color: accentColor, fontSize: 11, fontWeight: 800 }}>
          Ver detalle
        </span>
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {displayedTotals.map(({ currency, amount }) => (
          <div
            key={currency}
            style={{
              color: accentColor,
              fontSize: 25,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 900,
            }}
          >
            {currencySymbol(currency)}{fmt(amount)}
            <span
              style={{
                color: C.text2,
                fontSize: 11,
                fontWeight: 700,
                marginLeft: 6,
              }}
            >
              {currency}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}

// GROUP PAGE
export function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // undefined = cargando, null = no existe
  const [group, setGroupState] = useState<Group | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  const [debtDebtor, setDebtDebtor] = useState("");
  const [debtLender, setDebtLender] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState("CRC");
  const [debtReason, setDebtReason] = useState("");
  const [addingDebt, setAddingDebt] = useState(false);
  const [debtError, setDebtError] = useState("");
  const [debtFilter, setDebtFilter] = useState<"all" | "owed" | "owing">(
    "all",
  );
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  const [splitAmount, setSplitAmount] = useState("");
  const [splitCurrency, setSplitCurrency] = useState("CRC");
  const [splitLender, setSplitLender] = useState("");
  const [splitExcludeLender, setSplitExcludeLender] = useState(false);
  const [splitDebtors, setSplitDebtors] = useState<string[]>([]);
  const [splitReason, setSplitReason] = useState("");
  const [savingSplit, setSavingSplit] = useState(false);
  const [splitError, setSplitError] = useState("");

  const [searchDebtor, setSearchDebtor] = useState("");
  const [searchLender, setSearchLender] = useState("");
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [comparePersonA, setComparePersonA] = useState("");
  const [comparePersonB, setComparePersonB] = useState("");
  const [compareCurrency, setCompareCurrency] = useState("CRC");
  const [compareResult, setCompareResult] = useState<
    ReturnType<typeof computeMutualDebt> | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [activeDialog, setActiveDialog] = useState<
    | "invite"
    | "newDebt"
    | "search"
    | "split"
    | "summary"
    | "receivables"
    | "payment"
    | null
  >(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const dialogPanelRef = useRef<HTMLDivElement | null>(null);

  const resetDebtForm = useCallback(() => {
    setDebtDebtor("");
    setDebtLender("");
    setDebtAmount("");
    setDebtCurrency("CRC");
    setDebtReason("");
    setDebtError("");
  }, []);

  const resetSplitForm = useCallback(() => {
    setSplitAmount("");
    setSplitCurrency("CRC");
    setSplitLender("");
    setSplitExcludeLender(false);
    setSplitDebtors([]);
    setSplitReason("");
    setSplitError("");
  }, []);

  const closeDialog = useCallback(() => {
    if (addingMember || savingSplit || payingId || addingDebt) return;
    const hasDebtChanges = Boolean(
      debtDebtor ||
        debtLender ||
        debtAmount ||
        debtCurrency !== "CRC" ||
        debtReason.trim(),
    );
    const hasSplitChanges = Boolean(
      splitAmount ||
        splitCurrency !== "CRC" ||
        splitLender ||
        splitDebtors.length ||
        splitReason.trim() ||
        splitExcludeLender,
    );
    const isDebtFlow = activeDialog === "newDebt" || activeDialog === "split";
    if (
      isDebtFlow &&
      (hasDebtChanges || hasSplitChanges) &&
      !window.confirm("¿Descartar los cambios sin guardar?")
    ) {
      return;
    }
    if (isDebtFlow) {
      resetDebtForm();
      resetSplitForm();
    }
    setActiveDialog(null);
    setPaymentDebt(null);
    setPaymentAmount("");
    setPaymentError("");
    setDebtError("");
    dialogTriggerRef.current?.focus();
  }, [
    activeDialog,
    addingDebt,
    addingMember,
    debtAmount,
    debtCurrency,
    debtDebtor,
    debtLender,
    debtReason,
    payingId,
    resetDebtForm,
    resetSplitForm,
    savingSplit,
    splitAmount,
    splitCurrency,
    splitDebtors.length,
    splitExcludeLender,
    splitLender,
    splitReason,
  ]);

  const refetch = async () => {
    if (!id) return;
    try {
      const g = await getFullGroup(id);
      setGroupState(g);
    } catch (err) {
      console.error(err);
      setLoadError("No se pudo cargar el grupo.");
      setGroupState(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const g = await getFullGroup(id);
        setGroupState(g);
      } catch (err) {
        console.error(err);
        setLoadError("No se pudo cargar el grupo.");
        setGroupState(null);
      }
    };
    load();
  }, [id]);

  // Vuelve a cargar cuando se resuelve la sesión, así el botón de
  // confirmar pago se habilita apenas el magic link vincula al usuario.
  useEffect(() => {
    const load = async () => {
      if (user) {
        if (!id) return;
        try {
          const g = await getFullGroup(id);
          setGroupState(g);
        } catch (err) {
          console.error(err);
          setLoadError("No se pudo cargar el grupo.");
          setGroupState(null);
        }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!activeDialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const panel = dialogPanelRef.current;
      const initialControl =
        panel?.querySelector<HTMLElement>("[data-dialog-initial-focus]") ??
        panel?.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-dialog-close])',
        ) ??
        panel?.querySelector<HTMLElement>('button:not([disabled])');
      initialControl?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDialog]);

  useEffect(() => {
    if (!activeDialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !addingMember && !savingSplit && !payingId && !addingDebt) {
        closeDialog();
      }
      if (event.key === "Tab") {
        const controls = dialogPanelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeDialog,
    addingDebt,
    addingMember,
    closeDialog,
    payingId,
    savingSplit,
  ]);

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: C.bg,
    color: C.text,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
  };

  if (group === undefined) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: C.text2 }}>Cargando…</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div
        style={{
          ...pageStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: C.text2, marginBottom: 20 }}>
            {loadError || "Grupo no encontrado"}
          </p>
          <Btn
            onClick={() => navigate("/")}
            style={{ width: "auto", padding: "12px 28px" }}
          >
            Volver al inicio
          </Btn>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: "20px 24px",
          textAlign: "center",
          color: C.text3,
          fontSize: 13,
        }}
      >
        RegistroDeudas
      </div>
    </div>
  );
}

  const myMember = user
    ? group.members.find((m) => m.userId === user.uid)
    : undefined;
  const sessionDebts = myMember
    ? group.debts.filter(
        (debt) =>
          debt.debtorId === myMember.id || debt.lenderId === myMember.id,
      )
    : group.debts;
  const activeDebts = sessionDebts.filter((d) => d.status !== "pagada");
  const myDebtBreakdown = computeMemberDebtBreakdown(group, myMember?.id);
  const myReceivableBreakdown = computeMemberReceivableBreakdown(
    group,
    myMember?.id,
  );
  const personalBalances = computePersonalBalances(group, myMember?.id);
  const groupPendingTotals = computeGroupPendingTotals({
    ...group,
    debts: sessionDebts,
  });
  const personalBalanceState =
    personalBalances.length === 0 || personalBalances.every(({ net }) => net === 0)
      ? "Al día"
      : personalBalances.every(({ net }) => net <= 0)
        ? "En contra"
        : personalBalances.every(({ net }) => net >= 0)
          ? "A favor"
          : "Balance por moneda";
  const filteredDebts = activeDebts
    .filter((debt) => {
      if (!myMember || debtFilter === "all") return true;
      return debtFilter === "owed"
        ? debt.lenderId === myMember.id
        : debt.debtorId === myMember.id;
    })
    .sort((a, b) => {
      if (!myMember) return 0;
      const aRelevant = a.debtorId === myMember.id || a.lenderId === myMember.id;
      const bRelevant = b.debtorId === myMember.id || b.lenderId === myMember.id;
      return Number(bRelevant) - Number(aRelevant);
    });
  const paymentRemaining = paymentDebt
    ? Math.max(0, paymentDebt.amount - paymentDebt.paidAmount)
    : 0;
  const paymentDebtor = paymentDebt
    ? group.members.find((member) => member.id === paymentDebt.debtorId)
    : undefined;
  const canConfirm = (d: Debt) =>
    !!myMember && myMember.id === d.lenderId;

  const copyCode = () => {
    navigator.clipboard.writeText(group.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addMember = async () => {
    const name = memberName.trim();
    const email = memberEmail.trim();
    if (!name || !email || addingMember) return;
    setAddingMember(true);
    setInviteMessage("");
    try {
      await dbAddMember(
        group.id,
        name,
        email,
        `${window.location.origin}/group/${group.id}`,
      );
      setMemberName("");
      setMemberEmail("");
      setInviteMessage(`Invitación enviada a ${email}`);
      await refetch();
    } catch (err) {
      console.error(err);
      setInviteMessage(
        "No se pudo agregar el miembro (¿ese correo ya está en el grupo?).",
      );
    } finally {
      setAddingMember(false);
    }
  };

  const addDebt = async () => {
    const amount = parseFloat(debtAmount);
    if (
      !debtDebtor ||
      !debtLender ||
      !amount ||
      debtDebtor === debtLender ||
      addingDebt
    )
      return;
    setAddingDebt(true);
    setDebtError("");
    try {
      await dbAddDebt(
        group.id,
        debtDebtor,
        debtLender,
        amount,
        debtCurrency,
        debtReason,
      );
      resetDebtForm();
      await refetch();
      setActiveDialog(null);
      dialogTriggerRef.current?.focus();
    } catch (err) {
      console.error(err);
      setDebtError("No se pudo registrar la deuda. Intenta nuevamente.");
    } finally {
      setAddingDebt(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentDebt || payingId) return;
    const amount = Number(paymentAmount);
    const remaining = Math.max(0, paymentDebt.amount - paymentDebt.paidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto mayor que cero.");
      return;
    }
    if (amount > remaining) {
      setPaymentError("El pago no puede superar el saldo pendiente.");
      return;
    }

    setPayingId(paymentDebt.id);
    setPaymentError("");
    try {
      await dbRecordDebtPayment(group.id, paymentDebt.id, amount);
      await refetch();
      setActiveDialog(null);
      setPaymentDebt(null);
      setPaymentAmount("");
      dialogTriggerRef.current?.focus();
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "No se pudo confirmar el pago.",
      );
    } finally {
      setPayingId(null);
    }
  };

  const doSearch = () => {
    if (searchDebtor && searchLender)
      setSearchResult(
        computeDebtBetween(searchDebtor, searchLender, sessionDebts),
      );
  };

  const doCompare = () => {
    if (
      !comparePersonA ||
      !comparePersonB ||
      comparePersonA === comparePersonB
    )
      return;
    setCompareResult(
      computeMutualDebt(
        comparePersonA,
        comparePersonB,
        compareCurrency,
        sessionDebts,
      ),
    );
  };

  const comparisonDebtor = compareResult?.debtorId
    ? group.members.find((member) => member.id === compareResult.debtorId)
    : undefined;
  const comparisonLender = compareResult?.lenderId
    ? group.members.find((member) => member.id === compareResult.lenderId)
    : undefined;

  const splitTotal = parseFloat(splitAmount);
  const splitItems = buildSplitDebts(splitTotal, splitLender, splitDebtors, {
    excludeLender: splitExcludeLender,
  });
  const splitShare = splitItems[0]?.amount ?? 0;

  const toggleSplitDebtor = (memberId: string) => {
    setSplitDebtors((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const saveSplitBill = async () => {
    setSplitError("");
    if (savingSplit) return;
    if (!splitLender) {
      setSplitError("Selecciona quien pagó la cuenta.");
      return;
    }
    if (!splitTotal || splitTotal <= 0) {
      setSplitError("Digita un monto válido.");
      return;
    }
    if (splitItems.length === 0) {
      setSplitError("Selecciona al menos una persona deudora.");
      return;
    }

    setSavingSplit(true);
    try {
      await Promise.all(
        splitItems.map((item) =>
          dbAddDebt(
            group.id,
            item.debtorId,
            item.lenderId,
            item.amount,
            splitCurrency,
            splitReason.trim() || "Cuenta dividida",
          ),
        ),
      );
      resetSplitForm();
      resetDebtForm();
      setActiveDialog(null);
      await refetch();
      dialogTriggerRef.current?.focus();
    } catch (err) {
      console.error(err);
      setSplitError("No se pudo dividir la cuenta.");
    } finally {
      setSavingSplit(false);
    }
  };

  const openDialog = (
    dialog:
      | "invite"
      | "newDebt"
      | "search"
      | "split"
      | "summary"
      | "receivables"
      | "payment",
    trigger: HTMLElement | null,
  ) => {
    dialogTriggerRef.current = trigger;
    setActiveDialog(dialog);
  };

  const openPaymentDialog = (debt: Debt, trigger: HTMLElement) => {
    dialogTriggerRef.current = trigger;
    setPaymentDebt(debt);
    setPaymentAmount(String(Math.max(0, debt.amount - debt.paidAmount)));
    setPaymentError("");
    setActiveDialog("payment");
  };

  return (
    <div style={pageStyle}>
      {/* Topbar */}
      <div
        className="group-dashboard-topbar"
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => navigate("/")}
          aria-label="Volver al inicio"
          title="Volver"
          style={{
            background: "none",
            border: "none",
            color: C.text2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontFamily: "inherit",
            fontWeight: 600,
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>

        <div className="group-dashboard-topbar-title" style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: C.text,
              letterSpacing: "0.04em",
            }}
          >
            COMPAS
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.text2,
            }}
          >
            <span>{group.name}</span>
            <span aria-hidden="true"> · </span>
            <span style={{ textTransform: "capitalize" }}>{group.type}</span>
          </div>
        </div>

        <div
          className="group-dashboard-topbar-actions"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          {user && (
            <div className="group-dashboard-user" style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.text2 }}>
                {myMember ? myMember.name : user.email}
              </div>
              <button
                onClick={() => signOut()}
                style={{
                  background: "none",
                  border: "none",
                  color: C.text3,
                  fontSize: 10,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                Salir
              </button>
            </div>
          )}
          <button
            className="group-dashboard-access-code"
            onClick={copyCode}
            aria-label="Copiar codigo del grupo"
            title="Copiar codigo"
            style={{
              background: C.accentLo,
              border: `1px solid rgba(124,109,250,0.3)`,
              borderRadius: 10,
              padding: "6px 14px",
              color: C.accentHi,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.16em",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copiado" : group.accessCode}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="group-dashboard-shell">
        <section className="group-balance" role="region" aria-label="Tu balance">
          <div className="group-balance-main">
            <div className="group-eyebrow">Tu balance</div>
            <div
              className="group-balance-state"
              data-tone={
                personalBalanceState === "A favor"
                  ? "positive"
                  : personalBalanceState === "En contra"
                    ? "negative"
                    : "neutral"
              }
            >
              {myMember ? personalBalanceState : "Vincula tu cuenta"}
            </div>
            <div className="group-balance-values">
              {(personalBalances.length > 0
                ? personalBalances
                : [{ currency: "CRC", owes: 0, isOwed: 0, net: 0 }]
              ).map(({ currency, net }) => (
                <div key={currency} className="group-balance-value">
                  {net > 0 ? "+" : net < 0 ? "−" : ""}
                  {currencySymbol(currency)}{fmt(Math.abs(net))} {currency}
                </div>
              ))}
            </div>
          </div>

          <div
            className="group-balance-actions"
            role="region"
            aria-label="Mis saldos"
          >
            <PersonalBalanceCard
              label="Mi deuda"
              totals={myDebtBreakdown.totals}
              accentColor={C.red}
              accentBackground="transparent"
              onClick={(trigger) => openDialog("summary", trigger)}
            />
            <PersonalBalanceCard
              label="Me deben"
              totals={myReceivableBreakdown.totals}
              accentColor={C.green}
              accentBackground="transparent"
              onClick={(trigger) => openDialog("receivables", trigger)}
            />
          </div>
        </section>

        <section className="group-balance-meta" aria-label="Resumen del grupo">
            <span>{group.members.length} miembros</span>
            <span>{activeDebts.length} deudas activas</span>
            <span className="group-balance-pending">
              <strong>Pendiente del grupo:</strong>{" "}
              {groupPendingTotals.length > 0
                ? groupPendingTotals.map(({ currency, amount }, index) => (
                    <span key={currency}>
                      {index > 0 ? " · " : ""}
                      {currencySymbol(currency)}{fmt(amount)} {currency}
                    </span>
                  ))
                : "Sin pendientes"}
            </span>
        </section>

        {/* Two-col layout */}
        <div
          className="group-dashboard-layout"
          style={{
            display: "grid",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Active debts */}
            <div style={{ ...baseCard, padding: 24 }}>
              <div
                className="group-debts-heading"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 20, fontWeight: 850 }}>Deudas</div>
                  <div style={{ color: C.text2, fontSize: 12, marginTop: 3 }}>
                    {filteredDebts.length} de {activeDebts.length} activas
                  </div>
                </div>
                <div className="group-debts-primary-actions">
                  <button
                    type="button"
                    className="group-secondary-button"
                    onClick={(event) => openDialog("search", event.currentTarget)}
                  >
                    Buscar deuda
                  </button>
                  <button
                    type="button"
                    className="group-primary-button"
                    onClick={(event) => openDialog("newDebt", event.currentTarget)}
                  >
                    + Nueva deuda
                  </button>
                </div>
              </div>

              <div className="group-debt-toolbar">
                <div className="group-debt-filters" aria-label="Filtros de deuda">
                  <button
                    type="button"
                    aria-pressed={debtFilter === "all"}
                    onClick={() => setDebtFilter("all")}
                  >
                    Todas
                  </button>
                  {myMember && (
                    <>
                      <button
                        type="button"
                        aria-label="Filtrar: Me deben"
                        aria-pressed={debtFilter === "owed"}
                        onClick={() => setDebtFilter("owed")}
                      >
                        Me deben
                      </button>
                      <button
                        type="button"
                        aria-label="Filtrar: Debo"
                        aria-pressed={debtFilter === "owing"}
                        onClick={() => setDebtFilter("owing")}
                      >
                        Debo
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="group-text-button"
                  onClick={(event) => openDialog("invite", event.currentTarget)}
                >
                  Invitar miembro
                </button>
              </div>

              {filteredDebts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 0",
                    color: C.text3,
                  }}
                >
                  <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 12 }}>✓</div>
                  <div
                    style={{ fontWeight: 700, color: C.text2, marginBottom: 4 }}
                  >
                    {activeDebts.length === 0
                      ? "Sin deudas pendientes"
                      : "No hay deudas en este filtro"}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {activeDebts.length === 0
                      ? "Todos los pagos están al día"
                      : "Prueba con otra vista de la lista."}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => openDialog("newDebt", event.currentTarget)}
                    style={{
                      marginTop: 18,
                      minHeight: 44,
                      borderRadius: 12,
                      border: "none",
                      background: C.accent,
                      color: "#fff",
                      padding: "0 18px",
                      fontFamily: "inherit",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    + Nueva deuda
                  </button>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {filteredDebts.map((d) => {
                    const debtor = group.members.find(
                      (m) => m.id === d.debtorId,
                    );
                    const lender = group.members.find(
                      (m) => m.id === d.lenderId,
                    );
                    const sym = currencySymbol(d.currency);
                    const rem = d.amount - d.paidAmount;
                    return (
                      <div
                        className="group-dashboard-debt-card"
                        key={d.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          padding: "16px 4px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          className="group-dashboard-debt-people"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          {debtor && <Avatar name={debtor.name} size={30} />}
                          <span style={{ color: C.text3, fontSize: 12 }}>
                            →
                          </span>
                          {lender && <Avatar name={lender.name} size={30} />}
                        </div>
                        <div
                          className="group-dashboard-debt-body"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: C.text,
                            }}
                          >
                            {debtor?.name}{" "}
                            <span style={{ color: C.text3, fontWeight: 400 }}>
                              debe a
                            </span>{" "}
                            {lender?.name}
                          </div>
                          {d.reason && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.text2,
                                marginTop: 2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {d.reason}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 10,
                              color: C.text3,
                              marginTop: 3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatCreatedAt(d.createdAt)}
                          </div>
                          <div
                            style={{
                              alignItems: "center",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <span className="group-status-badge">
                              {d.status === "parcial" ? "Abono registrado" : "Pendiente"}
                            </span>
                            <button
                              type="button"
                              className="group-text-button"
                              aria-expanded={expandedDebtId === d.id}
                              aria-controls={`debt-detail-${d.id}`}
                              aria-label={`Ver detalle de ${d.reason || `${debtor?.name} a ${lender?.name}`}`}
                              onClick={() =>
                                setExpandedDebtId((current) =>
                                  current === d.id ? null : d.id,
                                )
                              }
                            >
                              {expandedDebtId === d.id ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                          </div>
                          {expandedDebtId === d.id && (
                            <div
                              id={`debt-detail-${d.id}`}
                              className="group-debt-detail"
                            >
                              <span>
                                <strong>Monto original</strong>{" "}
                                {sym}{fmt(d.amount)} {d.currency}
                              </span>
                              {d.paidAmount > 0 && (
                                <span>
                                  <strong>Pagado</strong>{" "}
                                  {sym}{fmt(d.paidAmount)} {d.currency}
                                </span>
                              )}
                              <span>
                                {canConfirm(d)
                                  ? "Puedes registrar un pago recibido."
                                  : `Pendiente de confirmación de ${lender?.name ?? "la persona acreedora"}`}
                              </span>
                            </div>
                          )}
                        </div>
                        <div
                          className="group-dashboard-debt-amount"
                          style={{ textAlign: "right", flexShrink: 0 }}
                        >
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: C.red,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {sym}
                            {fmt(rem)}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.text3,
                              marginBottom: 6,
                            }}
                          >
                            {d.currency}
                          </div>
                          {canConfirm(d) ? (
                            <button
                              onClick={(event) =>
                                openPaymentDialog(d, event.currentTarget)
                              }
                              disabled={payingId === d.id}
                              style={{
                                background: C.greenLo,
                                border: `1px solid rgba(74,222,128,0.25)`,
                                borderRadius: 8,
                                padding: "4px 12px",
                                color: C.green,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor:
                                  payingId === d.id ? "not-allowed" : "pointer",
                                opacity: payingId === d.id ? 0.5 : 1,
                                fontFamily: "inherit",
                              }}
                            >
                              {payingId === d.id ? "…" : "Registrar pago"}
                            </button>
                          ) : (
                            <div
                              style={{
                                fontSize: 9,
                                color: C.text3,
                                maxWidth: 90,
                                lineHeight: 1.3,
                              }}
                            >
                              Solo {lender?.name} confirma
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
      <footer className="app-version-footer" aria-label="Versión de la aplicación">
        v{versionInfo.version}
      </footer>
      {activeDialog && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            ref={dialogPanelRef}
            className="group-dashboard-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`group-${activeDialog}-dialog-title`}
            style={{
              ...baseCard,
              padding: 22,
              maxHeight: "calc(100vh - 2rem)",
              overflowY: "auto",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                id={`group-${activeDialog}-dialog-title`}
                style={{ fontSize: 18, fontWeight: 850 }}
              >
                {activeDialog === "invite"
                  ? "Invitar miembro"
                  : activeDialog === "newDebt"
                    ? "Nueva deuda"
                  : activeDialog === "split"
                    ? "Dividir cuenta"
                    : activeDialog === "payment"
                      ? "Registrar pago"
                      : activeDialog === "summary"
                        ? "Mi deuda"
                        : activeDialog === "receivables"
                          ? "Me deben"
                          : "Buscar deuda"}
              </div>
              <button
                type="button"
                data-dialog-close
                onClick={closeDialog}
                aria-label="Cerrar dialogo"
                title="Cerrar"
                disabled={addingDebt || addingMember || savingSplit || !!payingId}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${C.border2}`,
                  background: C.surface,
                  color: C.text2,
                  cursor:
                    addingDebt || addingMember || savingSplit || payingId
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {activeDialog === "newDebt" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="group-dialog-mode-switch">
                  <span>Deuda individual</span>
                  <button
                    type="button"
                    className="group-text-button"
                    onClick={() => setActiveDialog("split")}
                  >
                    Dividir cuenta
                  </button>
                </div>

                <label htmlFor="new-debt-debtor" className="group-field-label">
                  ¿Quién debe?
                </label>
                <StyledSelect
                  id="new-debt-debtor"
                  value={debtDebtor}
                  onChange={(value) => {
                    setDebtDebtor(value);
                    setDebtError("");
                  }}
                  autoFocus
                >
                  <option value="">Selecciona una persona</option>
                  {group.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </StyledSelect>

                <label htmlFor="new-debt-lender" className="group-field-label">
                  ¿A quién le deben?
                </label>
                <StyledSelect
                  id="new-debt-lender"
                  value={debtLender}
                  onChange={(value) => {
                    setDebtLender(value);
                    setDebtError("");
                  }}
                >
                  <option value="">Selecciona una persona</option>
                  {group.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </StyledSelect>

                <label htmlFor="new-debt-amount" className="group-field-label">
                  Monto
                </label>
                <div className="group-dashboard-control-row" style={{ display: "flex", gap: 8 }}>
                  <Input
                    id="new-debt-amount"
                    value={debtAmount}
                    onChange={(value) => {
                      setDebtAmount(value);
                      setDebtError("");
                    }}
                    placeholder="Monto"
                    type="number"
                    style={{ flex: 1 }}
                  />
                  <StyledSelect
                    value={debtCurrency}
                    onChange={setDebtCurrency}
                    ariaLabel="Moneda"
                    style={{ width: 86, flex: "none" }}
                  >
                    <option value="CRC">CRC</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </StyledSelect>
                </div>

                <label htmlFor="new-debt-reason" className="group-field-label">
                  Motivo opcional
                </label>
                <Input
                  id="new-debt-reason"
                  value={debtReason}
                  onChange={setDebtReason}
                  placeholder="Ej. Cena, taxi o entradas"
                />

                {debtDebtor && debtDebtor === debtLender && (
                  <div role="alert" style={{ color: C.red, fontSize: 13 }}>
                    El deudor y el acreedor deben ser personas distintas.
                  </div>
                )}
                {debtError && (
                  <div role="alert" style={{ color: C.red, fontSize: 13 }}>
                    {debtError}
                  </div>
                )}

                <Btn
                  onClick={addDebt}
                  disabled={
                    !debtDebtor ||
                    !debtLender ||
                    !debtAmount ||
                    debtDebtor === debtLender ||
                    addingDebt
                  }
                >
                  {addingDebt ? "Registrando…" : "Registrar deuda"}
                </Btn>
              </div>
            ) : activeDialog === "payment" && paymentDebt ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div style={{ color: C.text2, fontSize: 12, marginBottom: 5 }}>
                    Saldo pendiente de {paymentDebtor?.name ?? "la persona deudora"}
                  </div>
                  <div
                    style={{
                      color: C.red,
                      fontSize: 24,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {currencySymbol(paymentDebt.currency)}{fmt(paymentRemaining)} {paymentDebt.currency}
                  </div>
                </div>

                <label
                  htmlFor="group-payment-amount"
                  style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}
                >
                  Monto recibido
                </label>
                <div
                  className="group-dashboard-control-row"
                  style={{ display: "flex", gap: 8 }}
                >
                  <Input
                    id="group-payment-amount"
                    value={paymentAmount}
                    onChange={(value) => {
                      setPaymentAmount(value);
                      setPaymentError("");
                    }}
                    placeholder="Monto"
                    type="number"
                    style={{ flex: 1 }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      alignItems: "center",
                      background: C.surface,
                      border: `1px solid ${C.border2}`,
                      borderRadius: 10,
                      color: C.text2,
                      display: "flex",
                      fontWeight: 800,
                      justifyContent: "center",
                      minWidth: 64,
                    }}
                  >
                    {paymentDebt.currency}
                  </div>
                </div>
                <div style={{ color: C.text3, fontSize: 12, lineHeight: 1.5 }}>
                  Puedes registrar un abono menor al saldo o completar la deuda.
                </div>
                {paymentError && (
                  <div role="alert" style={{ color: C.red, fontSize: 13 }}>
                    {paymentError}
                  </div>
                )}
                <Btn
                  onClick={submitPayment}
                  disabled={!paymentAmount || !!payingId}
                >
                  {payingId ? "Registrando…" : "Registrar pago"}
                </Btn>
              </div>
            ) : activeDialog === "summary" ? (
              <BalanceBreakdown
                totals={myDebtBreakdown.totals}
                parties={myDebtBreakdown.lenders.map((lender) => ({
                  id: lender.lenderId,
                  name: lender.lenderName,
                  amounts: lender.amounts,
                }))}
                totalLabel="Total pendiente"
                listLabel="Debes a"
                partyAriaPrefix="Deuda con"
                emptyMessage="No tienes deudas pendientes en esta sesión."
                accentColor={C.red}
                accentBackground={C.redLo}
              />
            ) : activeDialog === "receivables" ? (
              <BalanceBreakdown
                totals={myReceivableBreakdown.totals}
                parties={myReceivableBreakdown.debtors.map((debtor) => ({
                  id: debtor.debtorId,
                  name: debtor.debtorName,
                  amounts: debtor.amounts,
                }))}
                totalLabel="Total por cobrar"
                listLabel="Te deben"
                partyAriaPrefix="Deuda de"
                emptyMessage="Nadie tiene deudas pendientes contigo en esta sesión."
                accentColor={C.green}
                accentBackground={C.greenLo}
              />
            ) : activeDialog === "invite" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label htmlFor="invite-member-name" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Nombre
                </label>
                <Input
                  id="invite-member-name"
                  value={memberName}
                  onChange={setMemberName}
                  placeholder="Nombre"
                />
                <label htmlFor="invite-member-email" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Correo
                </label>
                <Input
                  id="invite-member-email"
                  value={memberEmail}
                  onChange={setMemberEmail}
                  placeholder="Correo del miembro"
                />
                <Btn
                  onClick={addMember}
                  disabled={
                    !memberName.trim() || !memberEmail.trim() || addingMember
                  }
                >
                  {addingMember ? "Enviando..." : "Invitar"}
                </Btn>
                {inviteMessage && (
                  <div style={{ fontSize: 13, color: C.text2 }}>
                    {inviteMessage}
                  </div>
                )}
              </div>
            ) : activeDialog === "split" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label htmlFor="split-total" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Monto total
                </label>
                <div
                  className="group-dashboard-control-row"
                  style={{ display: "flex", gap: 8 }}
                >
                  <Input
                    id="split-total"
                    value={splitAmount}
                    onChange={setSplitAmount}
                    placeholder="Monto"
                    type="number"
                    style={{ flex: 1 }}
                  />
                  <StyledSelect
                    value={splitCurrency}
                    onChange={setSplitCurrency}
                    ariaLabel="Moneda"
                    style={{
                      width: 78,
                      flex: "none",
                      paddingRight: 12,
                      backgroundImage: "none",
                    }}
                  >
                    <option value="CRC">₡</option>
                    <option value="USD">$</option>
                    <option value="EUR">€</option>
                  </StyledSelect>
                </div>

                <label htmlFor="split-lender" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Prestamista
                </label>
                <div
                  className="group-dashboard-split-lender-row"
                  style={{ display: "flex", gap: 10, alignItems: "center" }}
                >
                  <StyledSelect
                    id="split-lender"
                    value={splitLender}
                    onChange={(value) => {
                      setSplitLender(value);
                      setSplitDebtors((current) =>
                        current.filter((debtorId) => debtorId !== value),
                      );
                    }}
                    style={{ flex: 1 }}
                  >
                    <option value="">¿Quién pagó?</option>
                    {group.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </StyledSelect>
                  <label
                    title="No contar al prestamista dentro de las partes de la cuenta"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      minHeight: 44,
                      borderRadius: 10,
                      border: `1px solid ${C.border2}`,
                      background: splitExcludeLender ? C.accentLo : C.surface,
                      color: C.text,
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "0 10px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={splitExcludeLender}
                      onChange={(event) =>
                        setSplitExcludeLender(event.target.checked)
                      }
                    />
                    Excluir
                  </label>
                </div>

                <label style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Deudores
                </label>
                <div style={{ display: "grid", gap: 8 }}>
                  {group.members.map((member) => {
                    const disabled = member.id === splitLender;
                    const checked = splitDebtors.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minHeight: 42,
                          borderRadius: 10,
                          border: `1px solid ${checked ? C.accent : C.border2}`,
                          background: checked ? C.accentLo : C.surface,
                          color: disabled ? C.text3 : C.text,
                          cursor: disabled ? "not-allowed" : "pointer",
                          padding: "0 12px",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSplitDebtor(member.id)}
                        />
                        <Avatar name={member.name} size={26} />
                        <span>{member.name}</span>
                      </label>
                    );
                  })}
                </div>

                <label htmlFor="split-reason" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Motivo opcional
                </label>
                <Input
                  id="split-reason"
                  value={splitReason}
                  onChange={setSplitReason}
                  placeholder="Ej. Cena, super, viaje"
                />

                {splitItems.length > 0 && (
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        color: C.text2,
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      Cada persona deberá {currencySymbol(splitCurrency)}
                      {fmt(splitShare)}
                    </div>
                    <div style={{ color: C.text3, fontSize: 12 }}>
                      Se crearán {splitItems.length} deudas automáticamente.
                      {splitExcludeLender
                        ? " El prestamista está excluido del reparto."
                        : " El prestamista cuenta como una parte."}
                    </div>
                  </div>
                )}

                {splitError && (
                  <div style={{ color: C.red, fontSize: 13 }}>{splitError}</div>
                )}

                <Btn
                  onClick={saveSplitBill}
                  disabled={
                    savingSplit ||
                    !splitLender ||
                    !splitAmount ||
                    splitItems.length === 0
                  }
                >
                  {savingSplit ? "Guardando..." : "Guardar división"}
                </Btn>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label htmlFor="search-debtor" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Deudor
                </label>
                <StyledSelect id="search-debtor" value={searchDebtor} onChange={setSearchDebtor}>
                  <option value="">Deudor</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <label htmlFor="search-lender" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                  Prestamista
                </label>
                <StyledSelect id="search-lender" value={searchLender} onChange={setSearchLender}>
                  <option value="">Prestamista</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </StyledSelect>
                <Btn
                  onClick={doSearch}
                  disabled={!searchDebtor || !searchLender}
                  variant="secondary"
                >
                  Buscar
                </Btn>
                {searchResult !== null && (
                  <div
                    style={{
                      background: searchResult > 0 ? C.redLo : C.greenLo,
                      border: `1px solid ${searchResult > 0 ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
                      borderRadius: 12,
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: C.text2, fontSize: 12 }}>
                      Deuda total
                    </div>
                    <div
                      style={{
                        color: searchResult > 0 ? C.red : C.green,
                        fontSize: 28,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {currencySymbol("CRC")}
                      {fmt(searchResult)}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    marginTop: 10,
                    paddingTop: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 850 }}>
                    Comparar deuda
                  </div>
                  <div style={{ color: C.text3, fontSize: 12, lineHeight: 1.5 }}>
                    Compensa las deudas pendientes entre dos personas en una
                    misma moneda.
                  </div>

                  <label htmlFor="compare-person-a" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                    Persona A
                  </label>
                  <StyledSelect
                    id="compare-person-a"
                    value={comparePersonA}
                    onChange={(value) => {
                      setComparePersonA(value);
                      setCompareResult(null);
                    }}
                  >
                    <option value="">Persona A</option>
                    {group.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </StyledSelect>

                  <label htmlFor="compare-person-b" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                    Persona B
                  </label>
                  <StyledSelect
                    id="compare-person-b"
                    value={comparePersonB}
                    onChange={(value) => {
                      setComparePersonB(value);
                      setCompareResult(null);
                    }}
                  >
                    <option value="">Persona B</option>
                    {group.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </StyledSelect>

                  <label htmlFor="compare-currency" style={{ color: C.text2, fontSize: 13, fontWeight: 700 }}>
                    Moneda
                  </label>
                  <StyledSelect
                    id="compare-currency"
                    value={compareCurrency}
                    onChange={(value) => {
                      setCompareCurrency(value);
                      setCompareResult(null);
                    }}
                  >
                    <option value="CRC">CRC (₡)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </StyledSelect>

                  <Btn
                    onClick={doCompare}
                    disabled={
                      !comparePersonA ||
                      !comparePersonB ||
                      comparePersonA === comparePersonB
                    }
                  >
                    Comparar
                  </Btn>

                  {compareResult && (
                    <div
                      style={{
                        background:
                          compareResult.amount > 0 ? C.redLo : C.greenLo,
                        border: `1px solid ${
                          compareResult.amount > 0
                            ? "rgba(248,113,113,0.25)"
                            : "rgba(74,222,128,0.25)"
                        }`,
                        borderRadius: 12,
                        padding: 16,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: C.text2,
                          fontSize: 11,
                          fontWeight: 700,
                          marginBottom: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        Resultado compensado
                      </div>
                      {compareResult.amount === 0 ? (
                        <div style={{ color: C.green, fontWeight: 800 }}>
                          No hay deuda pendiente entre ambos.
                        </div>
                      ) : (
                        <>
                          <div style={{ color: C.text, fontWeight: 800 }}>
                            {comparisonDebtor?.name} debe a {comparisonLender?.name}
                          </div>
                          <div
                            style={{
                              color: C.red,
                              fontSize: 28,
                              fontWeight: 900,
                              fontVariantNumeric: "tabular-nums",
                              margin: "4px 0 8px",
                            }}
                          >
                            {currencySymbol(compareCurrency)}
                            {fmt(compareResult.amount)}
                          </div>
                          <div style={{ color: C.text3, fontSize: 12 }}>
                            {comparisonLender?.name} no debe nada a {comparisonDebtor?.name}.
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
