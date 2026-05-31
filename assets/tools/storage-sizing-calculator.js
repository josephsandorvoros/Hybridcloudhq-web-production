(() => {
  const form = document.querySelector('form[data-tool="storage-sizing"]');
  if (!form) return;

  const inputDaily = document.getElementById("dailyGb");
  const inputRetention = document.getElementById("retentionDays");
  const inputReplica = document.getElementById("replicaFactor");
  const inputCompression = document.getElementById("compressionRatio");
  const inputGrowth = document.getElementById("growthPct");

  const usableResult = document.getElementById("usableResult");
  const rawResult = document.getElementById("rawResult");
  const purchaseResult = document.getElementById("purchaseResult");
  const errorEl = document.getElementById("toolError");
  const resetButton = document.getElementById("resetTool");

  const defaultValues = {
    daily: 120,
    retention: 30,
    replica: 2,
    compression: 1.5,
    growth: 25
  };

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatTb(tb) {
    if (!Number.isFinite(tb)) return "-";
    return `${tb.toFixed(2)} TB`;
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }

  function validateInputs(dailyGb, retentionDays, replicaFactor, compressionRatio, growthPct) {
    if (dailyGb < 0) return "Daily data must be zero or greater.";
    if (retentionDays < 1) return "Retention must be at least 1 day.";
    if (replicaFactor < 1) return "Replication factor must be at least 1.";
    if (compressionRatio < 1) return "Compression ratio must be at least 1.";
    if (growthPct < 0) return "Growth and safety buffer cannot be negative.";
    return "";
  }

  function calculateAndRender() {
    const dailyGb = toNumber(inputDaily.value);
    const retentionDays = toNumber(inputRetention.value);
    const replicaFactor = toNumber(inputReplica.value);
    const compressionRatio = toNumber(inputCompression.value);
    const growthPct = toNumber(inputGrowth.value);

    if ([dailyGb, retentionDays, replicaFactor, compressionRatio, growthPct].some((n) => Number.isNaN(n))) {
      showError("Please enter valid numeric values for all fields.");
      return;
    }

    const validationMessage = validateInputs(
      dailyGb,
      retentionDays,
      replicaFactor,
      compressionRatio,
      growthPct
    );

    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    clearError();

    const usableGb = dailyGb * retentionDays;
    const rawGb = (usableGb * replicaFactor) / compressionRatio;
    const purchaseGb = rawGb * (1 + growthPct / 100);

    const usableTb = usableGb / 1024;
    const rawTb = rawGb / 1024;
    const purchaseTb = purchaseGb / 1024;

    usableResult.textContent = formatTb(usableTb);
    rawResult.textContent = formatTb(rawTb);
    purchaseResult.textContent = formatTb(purchaseTb);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  [inputDaily, inputRetention, inputReplica, inputCompression, inputGrowth].forEach((input) => {
    input.addEventListener("input", () => {
      if (!errorEl.hidden) {
        calculateAndRender();
      }
    });
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      inputDaily.value = String(defaultValues.daily);
      inputRetention.value = String(defaultValues.retention);
      inputReplica.value = String(defaultValues.replica);
      inputCompression.value = String(defaultValues.compression);
      inputGrowth.value = String(defaultValues.growth);
      calculateAndRender();
    });
  }

  calculateAndRender();
})();