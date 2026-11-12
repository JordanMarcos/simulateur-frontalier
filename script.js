    (() => {
      const CHARGES_RATE = 0.15;
      const TAX_RATE = 0.10;
      const CHF_TO_EUR = 1.05;
      const CMU_RATE = 0.08;
      const PASS_2026 = 48060;
      const MIN_SALARY = 40000;
      const MAX_SALARY = 250000;
      const grossInput = document.querySelector("#gross-salary");
      const salaryRange = document.querySelector("#salary-range");
      const salaryRangeProgress = document.querySelector("#salary-range-progress");
      const salaryRangeMinLabel = document.querySelector("#salary-range-min-label");
      const salaryRangeMaxLabel = document.querySelector("#salary-range-max-label");
      const errorMessage = document.querySelector("#salary-error");
      const healthSystem = document.querySelector("#health-system");
      const rfrInput = document.querySelector("#rfr-income");
      const lamalPremiumInput = document.querySelector("#lamal-premium");
      const healthError = document.querySelector("#health-error");
      const healthInfo = document.querySelector("#health-info");
      const periodButtons = document.querySelectorAll(".period-option");
      const themeToggle = document.querySelector("#theme-toggle");
      const copyButton = document.querySelector("#copy-result");
      const copyStatus = document.querySelector("#copy-status");
      const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
      let period = "monthly";
      let grossAnnual = Number(grossInput.value);
      let currentCalculation = null;

      const formatMoney = (amount, currency) =>
        `${numberFormat.format(Math.round(amount))} ${currency}`;

      function currentSalaryFactor() {
        return period === "monthly" ? 12 : 1;
      }

      function updateSalaryControls() {
        const factor = currentSalaryFactor();
        const min = MIN_SALARY / factor;
        const max = MAX_SALARY / factor;
        const amount = grossAnnual / factor;
        const isMonthly = period === "monthly";
        const label = `Salaire ${isMonthly ? "mensuel" : "annuel"} brut`;

        document.querySelector("#gross-salary-label").textContent = label;
        document.querySelector("#salary-help").textContent =
          `Montant ${isMonthly ? "mensuel" : "annuel"} avant cotisations et impôts`;
        grossInput.min = String(min);
        grossInput.max = String(max);
        grossInput.step = isMonthly ? "0.01" : "1";
        grossInput.value = Number.isFinite(amount) ? String(Number(amount.toFixed(2))) : "";
        salaryRange.min = String(min);
        salaryRange.max = String(max);
        salaryRange.value = Number.isFinite(amount) ? String(amount) : String(min);
        salaryRangeMinLabel.textContent = formatMoney(min, "CHF");
        salaryRangeMaxLabel.textContent = formatMoney(max, "CHF");
        salaryRangeProgress.style.width = Number.isFinite(amount)
          ? `${Math.max(0, Math.min(100, (amount - min) / (max - min) * 100))}%`
          : "0";
      }

      function updateHealthInputs() {
        const isCmu = healthSystem.value === "cmu";
        document.querySelector("#cmu-input-box").hidden = !isCmu;
        document.querySelector("#lamal-input-box").hidden = isCmu;
        rfrInput.removeAttribute("aria-invalid");
        lamalPremiumInput.removeAttribute("aria-invalid");
        healthInfo.textContent = isCmu
          ? "Saisissez le RFR annuel retenu par l’Urssaf. Estimation : 8 % du RFR après abattement de 25 % du PASS 2026."
          : "Saisissez la prime mensuelle effective de votre contrat en CHF. La prime LAMal dépend du contrat et du profil, pas du salaire.";
        updateResults();
      }

      themeToggle.addEventListener("click", () => {
        const isDark = document.body.dataset.theme !== "dark";
        const label = isDark ? "Activer le mode clair" : "Activer le mode sombre";
        document.body.dataset.theme = isDark ? "dark" : "light";
        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute("aria-label", label);
        themeToggle.title = label;
        themeToggle.querySelector(".theme-toggle-label").textContent = isDark ? "Mode clair" : "Mode sombre";
        document.querySelector('meta[name="theme-color"]').setAttribute(
          "content",
          isDark ? "#111813" : "#f5f6f2"
        );
      });

      function clearResults() {
        for (const id of [
          "net-chf", "net-eur", "gross-label", "breakdown-net",
          "breakdown-charges", "breakdown-tax", "alternate-chf",
          "alternate-eur", "breakdown-health"
        ]) {
          document.getElementById(id).textContent = "—";
        }
        for (const id of ["chart-net", "chart-charges", "chart-tax", "chart-health"]) {
          document.getElementById(id).style.width = "0";
        }
        currentCalculation = null;
        document.querySelector("#salary-chart").setAttribute(
          "aria-label",
          "Répartition indisponible : vérifiez le salaire et les informations d’assurance maladie."
        );
      }

      function updateResults() {
        const rawValue = grossInput.value.trim();
        const enteredSalary = Number(rawValue);
        const isValidSalary = rawValue !== "" && Number.isFinite(enteredSalary)
          && Number.isFinite(grossAnnual)
          && grossAnnual >= MIN_SALARY && grossAnnual <= MAX_SALARY;

        if (!isValidSalary) {
          errorMessage.textContent = rawValue === ""
            ? "Saisissez un montant pour afficher l’estimation."
            : `Saisissez un salaire ${period === "monthly" ? "mensuel" : "annuel"} équivalent à un montant annuel entre 40 000 et 250 000 CHF.`;
          grossInput.setAttribute("aria-invalid", "true");
          copyButton.disabled = true;
          clearResults();
          return;
        }

        let healthCostAnnual;
        if (healthSystem.value === "cmu") {
          const rawRfr = rfrInput.value.trim();
          const rfr = Number(rawRfr);
          if (rawRfr === "" || !Number.isFinite(rfr) || rfr < 0) {
            healthError.textContent = rawRfr === ""
              ? "Saisissez le RFR annuel pour calculer la cotisation CMU."
              : "Saisissez un RFR annuel positif ou nul.";
            rfrInput.setAttribute("aria-invalid", "true");
            copyButton.disabled = true;
            clearResults();
            return;
          }
          rfrInput.removeAttribute("aria-invalid");
          healthCostAnnual = Math.max(0, rfr - PASS_2026 * 0.25) * CMU_RATE / CHF_TO_EUR;
        } else {
          const rawPremium = lamalPremiumInput.value.trim();
          const premium = Number(rawPremium);
          if (rawPremium === "" || !Number.isFinite(premium) || premium < 0) {
            healthError.textContent = rawPremium === ""
              ? "Saisissez la prime LAMal mensuelle de votre contrat."
              : "Saisissez une prime LAMal positive ou nulle.";
            lamalPremiumInput.setAttribute("aria-invalid", "true");
            copyButton.disabled = true;
            clearResults();
            return;
          }
          lamalPremiumInput.removeAttribute("aria-invalid");
          healthCostAnnual = premium * 12;
        }

        errorMessage.textContent = "";
        healthError.textContent = "";
        grossInput.removeAttribute("aria-invalid");
        copyButton.disabled = false;
        const factor = currentSalaryFactor();
        const min = MIN_SALARY / factor;
        const max = MAX_SALARY / factor;
        const enteredAmount = grossAnnual / factor;
        salaryRange.value = String(enteredAmount);
        salaryRangeProgress.style.width = `${(enteredAmount - min) / (max - min) * 100}%`;

        const charges = grossAnnual * CHARGES_RATE;
        const tax = grossAnnual * TAX_RATE;
        const net = grossAnnual - charges - tax - healthCostAnnual;
        const values = period === "monthly"
          ? {
            gross: grossAnnual / 12,
            charges: charges / 12,
            tax: tax / 12,
            health: healthCostAnnual / 12,
            net: net / 12
          }
          : { gross: grossAnnual, charges, tax, health: healthCostAnnual, net };
        const netMonthly = net / 12;
        const alternatePeriod = period === "monthly"
          ? { label: "Net annuel", amount: net }
          : { label: "Net mensuel", amount: netMonthly };
        const chartAmounts = {
          net: Math.max(0, net),
          charges,
          tax,
          health: healthCostAnnual
        };
        const chartTotal = Object.values(chartAmounts).reduce((sum, amount) => sum + amount, 0);

        document.querySelector("#net-chf").textContent = formatMoney(values.net, "CHF");
        document.querySelector("#net-eur").textContent = formatMoney(values.net * CHF_TO_EUR, "EUR");
        document.querySelector("#gross-label").textContent = `${formatMoney(values.gross, "CHF")} brut`;
        document.querySelector("#breakdown-net").textContent = formatMoney(values.net, "CHF");
        document.querySelector("#breakdown-charges").textContent = formatMoney(values.charges, "CHF");
        document.querySelector("#breakdown-tax").textContent = formatMoney(values.tax, "CHF");
        document.querySelector("#breakdown-health").textContent = formatMoney(values.health, "CHF");
        document.querySelector("#alternate-period-label").textContent = alternatePeriod.label;
        document.querySelector("#alternate-chf").textContent = formatMoney(alternatePeriod.amount, "CHF");
        document.querySelector("#alternate-eur").textContent = formatMoney(alternatePeriod.amount * CHF_TO_EUR, "EUR");

        for (const [key, amount] of Object.entries(chartAmounts)) {
          document.querySelector(`#chart-${key}`).style.width =
            `${chartTotal > 0 ? amount / chartTotal * 100 : 0}%`;
        }
        document.querySelector("#salary-chart").setAttribute(
          "aria-label",
          `Répartition du salaire ${period === "monthly" ? "mensuel" : "annuel"} : net ${formatMoney(values.net, "CHF")}, charges ${formatMoney(values.charges, "CHF")}, impôts ${formatMoney(values.tax, "CHF")}, assurance santé ${formatMoney(values.health, "CHF")}.`
        );
        currentCalculation = {
          gross: grossAnnual,
          charges,
          tax,
          health: healthCostAnnual,
          net,
          healthSystem: healthSystem.value,
          rfr: healthSystem.value === "cmu" ? Number(rfrInput.value) : null,
          premium: healthSystem.value === "lamal" ? Number(lamalPremiumInput.value) : null
        };
      }

      for (const button of periodButtons) {
        button.addEventListener("click", () => {
          if (button.dataset.period !== "monthly" && button.dataset.period !== "annual") return;
          period = button.dataset.period;
          for (const option of periodButtons) {
            option.setAttribute("aria-pressed", String(option === button));
          }
          document.querySelector("#period-heading").textContent = period === "monthly" ? "Net mensuel" : "Net annuel";
          updateSalaryControls();
          updateResults();
        });
      }

      function buildSummary() {
        const calculation = currentCalculation;
        if (!calculation) return "";
        // Espaces insécables fines (fr-FR) → espaces normales pour un collage propre partout.
        const money = (amount, currency) => formatMoney(amount, currency).replace(/[  ]/g, " ");
        const healthName = calculation.healthSystem === "cmu" ? "CMU" : "LAMal";
        return [
          "Simulation salaire frontalier — Genève / France",
          "",
          `Salaire annuel brut : ${money(calculation.gross, "CHF")}`,
          `Net mensuel : ${money(calculation.net / 12, "CHF")} (${money(calculation.net / 12 * CHF_TO_EUR, "EUR")})`,
          `Net annuel : ${money(calculation.net, "CHF")} (${money(calculation.net * CHF_TO_EUR, "EUR")})`,
          "",
          "Répartition annuelle :",
          `- Net : ${money(calculation.net, "CHF")}`,
          `- Cotisations sociales estimées (15 %, hypothèse) : ${money(calculation.charges, "CHF")}`,
          `- Impôts estimés (10 %, hypothèse) : ${money(calculation.tax, "CHF")}`,
          `- Assurance santé ${healthName} : ${money(calculation.health, "CHF")}`,
          ...(calculation.healthSystem === "cmu"
            ? [`- RFR annuel déclaré : ${money(calculation.rfr, "EUR")}`]
            : [`- Prime LAMal mensuelle saisie : ${money(calculation.premium, "CHF")}`]),
          "",
          "Taux de conversion : 1 CHF = 1,05 EUR",
          "Estimation indicative uniquement."
        ].join("\n");
      }

      function copyWithFallback(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        if (!ok) throw new Error("copy failed");
      }

      let copyResetTimer;
      copyButton.addEventListener("click", async () => {
        const text = buildSummary();
        if (!text) return;
        clearTimeout(copyResetTimer);
        copyStatus.classList.remove("is-error");
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            copyWithFallback(text);
          }
          copyButton.classList.add("is-copied");
          copyButton.querySelector(".copy-button-label").textContent = "Copié";
          copyStatus.textContent = "Résultat copié dans le presse-papiers.";
        } catch {
          copyStatus.classList.add("is-error");
          copyStatus.textContent = "Copie impossible, réessayez.";
        }
        copyResetTimer = setTimeout(() => {
          copyButton.classList.remove("is-copied");
          copyButton.querySelector(".copy-button-label").textContent = "Copier le résultat";
          copyStatus.textContent = "";
          copyStatus.classList.remove("is-error");
        }, 2500);
      });

      grossInput.addEventListener("input", () => {
        const enteredAmount = Number(grossInput.value);
        grossAnnual = grossInput.value.trim() === "" || !Number.isFinite(enteredAmount)
          ? NaN
          : enteredAmount * currentSalaryFactor();
        updateResults();
      });
      salaryRange.addEventListener("input", () => {
        grossAnnual = Number(salaryRange.value) * currentSalaryFactor();
        grossInput.value = String(Number((grossAnnual / currentSalaryFactor()).toFixed(2)));
        updateResults();
      });
      healthSystem.addEventListener("change", updateHealthInputs);
      rfrInput.addEventListener("input", updateResults);
      lamalPremiumInput.addEventListener("input", updateResults);
      updateHealthInputs();
      updateSalaryControls();
      updateResults();
    })();
