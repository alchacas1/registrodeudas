// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Group } from "../types";
import { GroupPage } from "./GroupPage";

const getFullGroup = vi.hoisted(() => vi.fn());
const addDebt = vi.hoisted(() => vi.fn());
const recordDebtPayment = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
}));

vi.mock("../lib/db", () => ({
  addDebt,
  addMember: vi.fn(),
  getFullGroup,
  recordDebtPayment,
}));

vi.mock("../lib/auth", () => ({
  useCurrentUser: () => ({ user: authState.user }),
  signOut: vi.fn(),
}));

const group: Group = {
  id: "group-1",
  ownerId: "owner-1",
  name: "Viaje",
  type: "amigos",
  members: [
    { id: "debtor", name: "Anders1", email: null, avatar: "", joinedAt: "" },
    { id: "lender", name: "Alvaro", email: null, avatar: "", joinedAt: "" },
  ],
  debts: [
    {
      id: "debt-1",
      debtorId: "debtor",
      lenderId: "lender",
      amount: 4560,
      currency: "CRC",
      reason: "CODEX SEPTIEMBRE",
      date: "2026-10-10",
      status: "pendiente",
      paidAmount: 0,
      createdAt: "2026-10-10T21:45:00.000Z",
    },
  ],
  createdAt: "2026-10-01T00:00:00.000Z",
  accessCode: "ABCDE",
};

function renderGroupPage() {
  return render(
    <MemoryRouter initialEntries={["/group/group-1"]}>
      <Routes>
        <Route path="/group/:id" element={<GroupPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GroupPage debt cards", () => {
  beforeEach(() => {
    authState.user = null;
    group.members[0].userId = undefined;
    group.members[1].userId = undefined;
    getFullGroup.mockReset();
    getFullGroup.mockResolvedValue(group);
    addDebt.mockReset().mockResolvedValue(undefined);
    recordDebtPayment.mockReset().mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("shows createdAt immediately below the debt reason", async () => {
    renderGroupPage();

    const reason = await screen.findByText("CODEX SEPTIEMBRE");
    const createdAt = screen.getByText("10 oct 2026, 3:45 p. m.");

    expect(reason.nextElementSibling).toBe(createdAt);
  });

  it("shows the app version in the footer", async () => {
    renderGroupPage();

    const footer = await screen.findByRole("contentinfo", { name: /versión/i });
    expect(footer.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("does not let the debtor confirm their own payment", async () => {
    authState.user = { uid: "debtor-user" };
    group.members[0].userId = "debtor-user";

    renderGroupPage();

    expect(await screen.findByText("Solo Alvaro confirma")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Pagar ✓" })).toBeNull();
  });

  it("lets the lender confirm the payment", async () => {
    authState.user = { uid: "lender-user" };
    group.members[1].userId = "lender-user";

    renderGroupPage();

    expect(
      await screen.findByRole("button", { name: "Registrar pago" }),
    ).toBeTruthy();
  });

  it("lets the lender register a partial payment and shows the remaining balance", async () => {
    authState.user = { uid: "lender-user" };
    const initialGroup = {
      ...group,
      members: [group.members[0], { ...group.members[1], userId: "lender-user" }],
    };
    const partiallyPaidGroup = {
      ...initialGroup,
      debts: [
        {
          ...group.debts[0],
          status: "parcial" as const,
          paidAmount: 1500,
        },
      ],
    };
    getFullGroup
      .mockReset()
      .mockResolvedValueOnce(initialGroup)
      .mockResolvedValueOnce(initialGroup)
      .mockResolvedValue(partiallyPaidGroup);

    renderGroupPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pago" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Registrar pago",
    });
    const amountInput = within(dialog).getByLabelText("Monto recibido");
    expect((amountInput as HTMLInputElement).value).toBe("4560");
    fireEvent.change(amountInput, { target: { value: "1500" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Registrar pago" }),
    );

    await waitFor(() =>
      expect(recordDebtPayment).toHaveBeenCalledWith(
        "group-1",
        "debt-1",
        1500,
      ),
    );
    await waitFor(() => {
      const debtCard = screen
        .getByText("CODEX SEPTIEMBRE")
        .closest(".group-dashboard-debt-card");
      expect(debtCard).toBeTruthy();
      expect(
        within(debtCard as HTMLElement).getByText(/3(?:[.\s\u00a0])060/),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeTruthy();
  });

  it("does not refocus the amount field while a payment is being registered", async () => {
    authState.user = { uid: "lender-user" };
    group.members[1].userId = "lender-user";
    let finishPayment: (() => void) | undefined;
    recordDebtPayment.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        finishPayment = resolve;
      }),
    );

    renderGroupPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Registrar pago" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Registrar pago" });
    const amountInput = within(dialog).getByLabelText("Monto recibido");
    const submitButton = within(dialog).getByRole("button", {
      name: "Registrar pago",
    });
    await waitFor(() => expect(document.activeElement).toBe(amountInput));
    submitButton.focus();
    fireEvent.click(submitButton);
    await waitFor(() => expect(recordDebtPayment).toHaveBeenCalledTimes(1));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 25));

    expect(screen.getByRole("dialog", { name: "Registrar pago" })).toBe(dialog);
    expect(document.activeElement).not.toBe(amountInput);

    finishPayment?.();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Registrar pago" })).toBeNull(),
    );
  });

  it("replaces the net balance block with personal debt and receivable cards", async () => {
    authState.user = { uid: "debtor-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        { ...group.members[0], userId: "debtor-user" },
        group.members[1],
      ],
      debts: [
        {
          ...group.debts[0],
          amount: 14772,
        },
        {
          ...group.debts[0],
          id: "debt-reverse",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 14772,
        },
      ],
    });

    renderGroupPage();

    const balances = await screen.findByRole("region", {
      name: "Mis saldos",
    });
    const debtCard = within(balances).getByRole("button", {
      name: "Mi deuda",
    });
    const receivableCard = within(balances).getByRole("button", {
      name: "Me deben",
    });

    expect(within(debtCard).getByText(/14(?:[.\s\u00a0])772/)).toBeTruthy();
    expect(
      within(receivableCard).getByText(/14(?:[.\s\u00a0])772/),
    ).toBeTruthy();
    expect(within(balances).queryByText("Saldo neto")).toBeNull();
    expect(screen.queryByText("Estado de Saldos")).toBeNull();
  });

  it("shows the signed-in member's total debt and amounts owed to each person", async () => {
    authState.user = { uid: "debtor-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        { ...group.members[0], userId: "debtor-user" },
        group.members[1],
        { id: "maria", name: "Maria", email: null, avatar: "", joinedAt: "" },
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "debt-2",
          amount: 2000,
          paidAmount: 500,
          status: "parcial",
          reason: "Supermercado",
        },
        {
          ...group.debts[0],
          id: "debt-3",
          lenderId: "maria",
          amount: 12,
          paidAmount: 0,
          currency: "USD",
          reason: "Taxi",
        },
        {
          ...group.debts[0],
          id: "debt-paid",
          lenderId: "maria",
          amount: 9000,
          paidAmount: 9000,
          status: "pagada",
        },
        {
          ...group.debts[0],
          id: "debt-reverse",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 3000,
        },
      ],
    });

    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "Mi deuda" }));

    const dialog = await screen.findByRole("dialog", { name: "Mi deuda" });
    const totals = within(dialog).getByLabelText("Total pendiente");
    expect(within(totals).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    expect(within(totals).getByText(/12 USD/)).toBeTruthy();

    const alvaroDebt = within(dialog).getByLabelText("Deuda con Alvaro");
    expect(within(alvaroDebt).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    const mariaDebt = within(dialog).getByLabelText("Deuda con Maria");
    expect(within(mariaDebt).getByText(/12 USD/)).toBeTruthy();
    expect(within(dialog).queryByText(/9(?:[.\s\u00a0])000/)).toBeNull();
    expect(within(dialog).queryByText(/3(?:[.\s\u00a0])000/)).toBeNull();
  });

  it("shows how much the signed-in member is owed by each debtor", async () => {
    authState.user = { uid: "lender-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        group.members[0],
        { ...group.members[1], userId: "lender-user" },
        { id: "maria", name: "Maria", email: null, avatar: "", joinedAt: "" },
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "debt-2",
          amount: 2000,
          paidAmount: 500,
          status: "parcial",
          reason: "Supermercado",
        },
        {
          ...group.debts[0],
          id: "debt-3",
          debtorId: "maria",
          amount: 12,
          paidAmount: 0,
          currency: "USD",
          reason: "Taxi",
        },
        {
          ...group.debts[0],
          id: "debt-paid",
          debtorId: "maria",
          amount: 9000,
          paidAmount: 9000,
          status: "pagada",
        },
        {
          ...group.debts[0],
          id: "debt-reverse",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 3000,
        },
      ],
    });

    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "Me deben" }));

    const dialog = await screen.findByRole("dialog", { name: "Me deben" });
    const totals = within(dialog).getByLabelText("Total por cobrar");
    expect(within(totals).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    expect(within(totals).getByText(/12 USD/)).toBeTruthy();

    const andersDebt = within(dialog).getByLabelText("Deuda de Anders1");
    expect(within(andersDebt).getByText(/6(?:[.\s\u00a0])060 CRC/)).toBeTruthy();
    const mariaDebt = within(dialog).getByLabelText("Deuda de Maria");
    expect(within(mariaDebt).getByText(/12 USD/)).toBeTruthy();
    expect(within(dialog).queryByText(/9(?:[.\s\u00a0])000/)).toBeNull();
    expect(within(dialog).queryByText(/3(?:[.\s\u00a0])000/)).toBeNull();
  });

  it("compares and compensates mutual debt in the selected currency", async () => {
    getFullGroup.mockResolvedValue({
      ...group,
      debts: [
        ...group.debts,
        {
          ...group.debts[0],
          id: "debt-2",
          debtorId: "lender",
          lenderId: "debtor",
          amount: 1000,
          reason: "Taxi",
          createdAt: "2026-10-10T22:00:00.000Z",
        },
      ],
    });
    renderGroupPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Buscar deuda" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Buscar deuda" });
    expect(within(dialog).getByText("Comparar deuda")).toBeTruthy();

    const selects = within(dialog).getAllByRole("combobox");
    fireEvent.change(selects[2], { target: { value: "debtor" } });
    fireEvent.change(selects[3], { target: { value: "lender" } });
    fireEvent.change(selects[4], { target: { value: "CRC" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Comparar" }));

    expect(within(dialog).getByText("Anders1 debe a Alvaro")).toBeTruthy();
    expect(within(dialog).getByText(/3(?:[.\s\u00a0])560/)).toBeTruthy();
  });

  it("centers the dashboard on a compact personal balance and explicit group metadata", async () => {
    authState.user = { uid: "debtor-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        { ...group.members[0], userId: "debtor-user" },
        group.members[1],
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "usd-debt",
          amount: 12,
          currency: "USD",
        },
      ],
    });

    renderGroupPage();

    expect(await screen.findByText("COMPAS")).toBeTruthy();
    expect(screen.getByText("Viaje")).toBeTruthy();
    const balance = screen.getByRole("region", { name: "Tu balance" });
    expect(within(balance).getByText("En contra")).toBeTruthy();
    expect(within(balance).getByText(/4(?:[.\s\u00a0])560 CRC/)).toBeTruthy();
    expect(within(balance).getByText(/12 USD/)).toBeTruthy();
    const groupSummary = screen.getByRole("region", { name: "Resumen del grupo" });
    expect(within(groupSummary).getByText("2 miembros")).toBeTruthy();
    expect(within(groupSummary).getByText("2 deudas activas")).toBeTruthy();
    expect(within(groupSummary).getByText(/4(?:[.\s\u00a0])560 CRC/)).toBeTruthy();
    expect(within(groupSummary).getByText(/12 USD/)).toBeTruthy();
  });

  it("opens the normal debt form from the primary action instead of showing it permanently", async () => {
    renderGroupPage();

    expect(await screen.findByRole("button", { name: "+ Nueva deuda" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Nueva deuda" })).toBeNull();
    expect(screen.queryByLabelText("¿Quién debe?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Nueva deuda" }));

    const dialog = screen.getByRole("dialog", { name: "Nueva deuda" });
    expect(within(dialog).getByLabelText("¿Quién debe?")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Dividir cuenta" })).toBeTruthy();
  });

  it("moves focus to the first useful field when the new debt modal opens", async () => {
    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "+ Nueva deuda" }));

    const debtorSelect = screen.getByLabelText("¿Quién debe?");
    await waitFor(() => expect(document.activeElement).toBe(debtorSelect));
  });

  it("keeps focus in a text field while its value changes", async () => {
    renderGroupPage();

    fireEvent.click(await screen.findByRole("button", { name: "+ Nueva deuda" }));

    const debtorSelect = screen.getByLabelText("¿Quién debe?");
    const reasonInput = screen.getByLabelText("Motivo opcional");
    await waitFor(() => expect(document.activeElement).toBe(debtorSelect));
    await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
    reasonInput.focus();
    fireEvent.change(reasonInput, { target: { value: "E" } });
    await new Promise<void>((resolve) => window.setTimeout(resolve, 25));

    expect(document.activeElement).toBe(reasonInput);
    expect((reasonInput as HTMLInputElement).value).toBe("E");
  });

  it("registers a normal debt through the modal with the existing database contract", async () => {
    renderGroupPage();
    fireEvent.click(await screen.findByRole("button", { name: "+ Nueva deuda" }));

    const dialog = screen.getByRole("dialog", { name: "Nueva deuda" });
    fireEvent.change(within(dialog).getByLabelText("¿Quién debe?"), {
      target: { value: "debtor" },
    });
    fireEvent.change(within(dialog).getByLabelText("¿A quién le deben?"), {
      target: { value: "lender" },
    });
    fireEvent.change(within(dialog).getByLabelText("Monto"), {
      target: { value: "3200" },
    });
    fireEvent.change(within(dialog).getByLabelText("Motivo opcional"), {
      target: { value: "Entradas" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar deuda" }));

    await waitFor(() =>
      expect(addDebt).toHaveBeenCalledWith(
        "group-1",
        "debtor",
        "lender",
        3200,
        "CRC",
        "Entradas",
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Nueva deuda" })).toBeNull(),
    );
  });

  it("asks before discarding changes from the new debt modal", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderGroupPage();
    fireEvent.click(await screen.findByRole("button", { name: "+ Nueva deuda" }));

    const dialog = screen.getByRole("dialog", { name: "Nueva deuda" });
    fireEvent.change(within(dialog).getByLabelText("Monto"), {
      target: { value: "500" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar dialogo" }));
    expect(screen.getByRole("dialog", { name: "Nueva deuda" })).toBeTruthy();

    confirm.mockReturnValue(true);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar dialogo" }));
    expect(screen.queryByRole("dialog", { name: "Nueva deuda" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Nueva deuda" }));
    expect((screen.getByLabelText("Monto") as HTMLInputElement).value).toBe("");
    confirm.mockRestore();
  });

  it("filters the debt list for the signed-in member", async () => {
    authState.user = { uid: "debtor-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        { ...group.members[0], userId: "debtor-user" },
        group.members[1],
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "reverse",
          debtorId: "lender",
          lenderId: "debtor",
          reason: "Taxi de regreso",
        },
      ],
    });

    renderGroupPage();
    await screen.findByText("CODEX SEPTIEMBRE");

    fireEvent.click(
      screen.getByRole("button", { name: "Filtrar: Me deben" }),
    );
    expect(screen.queryByText("CODEX SEPTIEMBRE")).toBeNull();
    expect(screen.getByText("Taxi de regreso")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Filtrar: Debo" }));
    expect(screen.getByText("CODEX SEPTIEMBRE")).toBeTruthy();
    expect(screen.queryByText("Taxi de regreso")).toBeNull();
  });

  it("hides debts between other members from the list, summary, and search", async () => {
    authState.user = { uid: "alvaro-user" };
    getFullGroup.mockResolvedValue({
      ...group,
      members: [
        group.members[0],
        { ...group.members[1], userId: "alvaro-user" },
        { id: "octavio", name: "Octavio", email: null, avatar: "", joinedAt: "" },
      ],
      debts: [
        group.debts[0],
        {
          ...group.debts[0],
          id: "alvaro-to-octavio",
          debtorId: "lender",
          lenderId: "octavio",
          amount: 2000,
          reason: "Alvaro con Octavio",
        },
        {
          ...group.debts[0],
          id: "anders-to-octavio",
          debtorId: "debtor",
          lenderId: "octavio",
          amount: 7000,
          reason: "Anders con Octavio",
        },
        {
          ...group.debts[0],
          id: "octavio-to-anders",
          debtorId: "octavio",
          lenderId: "debtor",
          amount: 9000,
          reason: "Octavio con Anders",
        },
      ],
    });

    renderGroupPage();

    expect(await screen.findByText("CODEX SEPTIEMBRE")).toBeTruthy();
    expect(screen.getByText("Alvaro con Octavio")).toBeTruthy();
    expect(screen.queryByText("Anders con Octavio")).toBeNull();
    expect(screen.queryByText("Octavio con Anders")).toBeNull();
    expect(screen.getByText("2 de 2 activas")).toBeTruthy();

    const summary = screen.getByRole("region", { name: "Resumen del grupo" });
    expect(within(summary).getByText("2 deudas activas")).toBeTruthy();
    expect(within(summary).getByText(/6(?:[.\s\u00a0])560 CRC/)).toBeTruthy();
    expect(within(summary).queryByText(/22(?:[.\s\u00a0])560 CRC/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Buscar deuda" }));
    const dialog = await screen.findByRole("dialog", { name: "Buscar deuda" });
    fireEvent.change(within(dialog).getByLabelText("Deudor"), {
      target: { value: "debtor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Prestamista"), {
      target: { value: "octavio" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Buscar" }));
    const searchedTotal = within(dialog).getByText("Deuda total").parentElement;
    expect(searchedTotal).toBeTruthy();
    expect(within(searchedTotal as HTMLElement).getByText("₡0")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("Persona A"), {
      target: { value: "debtor" },
    });
    fireEvent.change(within(dialog).getByLabelText("Persona B"), {
      target: { value: "octavio" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Comparar" }));
    expect(
      within(dialog).getByText("No hay deuda pendiente entre ambos."),
    ).toBeTruthy();
  });

  it("reveals debt details from each compact row", async () => {
    renderGroupPage();

    const detailButton = await screen.findByRole("button", {
      name: "Ver detalle de CODEX SEPTIEMBRE",
    });
    expect(detailButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(detailButton);
    expect(detailButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Monto original")).toBeTruthy();
    expect(screen.getByText("Pendiente de confirmación de Alvaro")).toBeTruthy();
  });
});
