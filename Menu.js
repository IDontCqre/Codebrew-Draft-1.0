const cards = document.querySelectorAll(".card");
const orderItemsEl = document.getElementById("order-items");
const orderSummaryEl = document.getElementById("order-summary");
const orderTotalEl = document.getElementById("order-total");
const orderStatusEl = document.getElementById("order-status");
const orderForm = document.getElementById("order-form");
const orderModal = document.getElementById("order-modal");
const orderModalErrorEl = document.getElementById("order-modal-error");
const orderConfirmBtn = document.getElementById("order-confirm");
const orderCancelBtn = document.getElementById("order-cancel");
const orderTypeModalInputs = document.querySelectorAll('input[name="order_type_modal"]');
const deliveryFieldsEl = document.getElementById("delivery-fields");
const pickupFieldsEl = document.getElementById("pickup-fields");
const deliveryNameInput = document.getElementById("delivery-name");
const deliveryContactInput = document.getElementById("delivery-contact");
const deliveryAddressInput = document.getElementById("delivery-address");
const pickupNameInput = document.getElementById("pickup-name");
const pickupContactInput = document.getElementById("pickup-contact");
const pickupNumberEl = document.getElementById("pickup-number");
const loadingOverlay = document.getElementById("loading-overlay");
const successModal = document.getElementById("success-modal");
const successCloseBtn = document.getElementById("success-close");
const successOrderIdEl = document.getElementById("success-order-id");
const successCancelBtn = document.getElementById("success-cancel");
const successSummaryEl = document.getElementById("success-summary");

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyU57HzFMNwRhhbIBHtEtue9BUzkuPxq19xl-guiTp7NbgFGFO-rXB5l-jzbajR-a64/exec";

const cart = new Map();
const deliveryInfo = {
  name: "",
  contact: "",
  address: ""
};
const pickupInfo = {
  name: "",
  contact: "",
  number: ""
};

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function getNextOrderSequence() {
  const dateKey = getTodayKey();
  const storageKey = `orderSeq:${dateKey}`;
  const lastValue = Number.parseInt(localStorage.getItem(storageKey) || "0", 10);
  const nextValue = Number.isFinite(lastValue) ? lastValue + 1 : 1;
  localStorage.setItem(storageKey, String(nextValue));
  return String(nextValue).padStart(3, "0");
}

function generateOrderId() {
  const dateKey = getTodayKey();
  const seq = getNextOrderSequence();
  return `ORD-${dateKey}-${seq}`;
}

function getNextPickupNumber() {
  const dateKey = getTodayKey();
  const storageKey = `pickupCounter:${dateKey}`;
  const lastValue = Number.parseInt(localStorage.getItem(storageKey) || "100000", 10);
  const nextValue = Number.isFinite(lastValue) ? lastValue + 1 : 100001;
  if (nextValue > 999999) {
    return "999999";
  }
  localStorage.setItem(storageKey, String(nextValue));
  return String(nextValue);
}

function formatPrice(value) {
  return `PHP ${value.toFixed(2)}`;
}

function ensurePriceTag(card, price) {
  let priceTag = card.querySelector(".price-tag");
  if (!priceTag) {
    priceTag = document.createElement("span");
    priceTag.className = "price-tag";
    card.appendChild(priceTag);
  }
  priceTag.textContent = formatPrice(price);
}

function getItemData(card, index) {
  const category = card.closest(".cards-column")?.querySelector(".category-title")?.textContent.trim() || "Uncategorized";
  const title = card.querySelector("h4")?.textContent.trim() || `Item ${index + 1}`;
  const description = card.querySelector("p")?.textContent.trim() || "";
  const rawPrice = card.dataset.price;
  const price = Number.parseFloat(rawPrice);
  const finalPrice = Number.isFinite(price) ? price : 0;

  if (!rawPrice) {
    card.dataset.price = String(finalPrice);
  }
  ensurePriceTag(card, finalPrice);

  return {
    id: String(index),
    category,
    title,
    description,
    price: finalPrice
  };
}

function renderOrder() {
  if (cart.size === 0) {
    orderItemsEl.innerHTML = '<li class="order-placeholder">Click a card to add it here.</li>';
    orderSummaryEl.textContent = "No items selected.";
    orderTotalEl.textContent = "Total: PHP 0.00";
    return;
  }

  const total = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity * item.price, 0);
  const rows = Array.from(cart.values())
    .map((item) => `
      <li class="order-row">
        <div class="order-row-text">
          <strong>${item.title}</strong>
          <span>${item.category} - ${formatPrice(item.price)}</span>
        </div>
        <div class="order-row-actions">
          <span>x${item.quantity}</span>
          <button type="button" class="qty-btn" data-remove-id="${item.id}" aria-label="Remove one ${item.title}">x</button>
        </div>
      </li>
    `)
    .join("");

  orderItemsEl.innerHTML = rows;
  orderSummaryEl.textContent = `${total} item${total > 1 ? "s" : ""} selected.`;
  orderTotalEl.textContent = `Total: ${formatPrice(totalCost)}`;
}

cards.forEach((card, index) => {
  const item = getItemData(card, index);
  card.dataset.itemId = item.id;

  card.addEventListener("click", () => {
    const existing = cart.get(item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.set(item.id, { ...item, quantity: 1 });
      card.classList.add("selected");
    }

    orderStatusEl.textContent = "";
    renderOrder();
  });
});

function openOrderModal() {
  orderModalErrorEl.textContent = "";
  deliveryNameInput.value = deliveryInfo.name;
  deliveryContactInput.value = deliveryInfo.contact;
  deliveryAddressInput.value = deliveryInfo.address;
  deliveryFieldsEl.classList.remove("open");
  pickupFieldsEl.classList.remove("open");
  pickupNameInput.value = pickupInfo.name;
  pickupContactInput.value = pickupInfo.contact;
  pickupNumberEl.textContent = pickupInfo.number ? `Pickup Number: ${pickupInfo.number}` : "Pickup Number: -";
  orderModal.classList.add("open");
  orderModal.setAttribute("aria-hidden", "false");
}

function closeOrderModal() {
  orderModal.classList.remove("open");
  orderModal.setAttribute("aria-hidden", "true");
}

function showLoading() {
  loadingOverlay.classList.add("open");
  loadingOverlay.setAttribute("aria-hidden", "false");
}

function hideLoading() {
  loadingOverlay.classList.remove("open");
  loadingOverlay.setAttribute("aria-hidden", "true");
}

function showSuccess() {
  successModal.classList.add("open");
  successModal.setAttribute("aria-hidden", "false");
}

function closeSuccess() {
  successModal.classList.remove("open");
  successModal.setAttribute("aria-hidden", "true");
}

successCloseBtn.addEventListener("click", closeSuccess);
successCancelBtn.addEventListener("click", () => {
  const cancelUrl = successCancelBtn.dataset.cancelUrl;
  if (cancelUrl) {
    window.open(cancelUrl, "_blank", "noopener");
  }
});
successModal.addEventListener("click", (event) => {
  if (event.target === successModal) {
    closeSuccess();
  }
});

orderTypeModalInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value === "Delivery") {
      deliveryFieldsEl.classList.add("open");
      pickupFieldsEl.classList.remove("open");
    } else {
      deliveryFieldsEl.classList.remove("open");
      pickupFieldsEl.classList.add("open");
      if (!pickupInfo.number) {
        pickupInfo.number = getNextPickupNumber();
      }
      pickupNumberEl.textContent = `Pickup Number: ${pickupInfo.number}`;
    }
  });
});

orderCancelBtn.addEventListener("click", () => {
  closeOrderModal();
});

orderModal.addEventListener("click", (event) => {
  if (event.target === orderModal) {
    closeOrderModal();
  }
});

orderItemsEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-remove-id]");
  if (!btn) return;

  const id = btn.dataset.removeId;
  const existing = cart.get(id);
  if (!existing) return;

  existing.quantity -= 1;
  if (existing.quantity <= 0) {
    cart.delete(id);
    const card = document.querySelector(`.card[data-item-id="${id}"]`);
    if (card) card.classList.remove("selected");
  }

  renderOrder();
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  orderStatusEl.textContent = "";

  if (cart.size === 0) {
    orderStatusEl.textContent = "Add at least one item before finalizing.";
    return;
  }

  openOrderModal();
});

orderConfirmBtn.addEventListener("click", async () => {
  const orderType = Array.from(orderTypeModalInputs).find((input) => input.checked)?.value;
  if (!orderType) {
    orderModalErrorEl.textContent = "Choose delivery or pickup before confirming.";
    return;
  }

  if (orderType === "Delivery") {
    const nameValue = deliveryNameInput.value.trim();
    const contactValue = deliveryContactInput.value.trim();
    const addressValue = deliveryAddressInput.value.trim();

    if (!nameValue || !contactValue || !addressValue) {
      orderModalErrorEl.textContent = "Name, contact number, and address are required for delivery.";
      return;
    }

    deliveryInfo.name = nameValue;
    deliveryInfo.contact = contactValue;
    deliveryInfo.address = addressValue;
    pickupInfo.name = "";
    pickupInfo.contact = "";
    pickupInfo.number = "";
  } else {
    deliveryInfo.name = "";
    deliveryInfo.address = "";
    const pickupNameValue = pickupNameInput.value.trim();
    const pickupContactValue = pickupContactInput.value.trim();
    if (!pickupNameValue) {
      orderModalErrorEl.textContent = "Name is required for pickup.";
      return;
    }
    if (!pickupContactValue) {
      orderModalErrorEl.textContent = "Contact number is required for pickup.";
      return;
    }
    if (!pickupInfo.number) {
      pickupInfo.number = getNextPickupNumber();
    }
    pickupInfo.name = pickupNameValue;
    pickupInfo.contact = pickupContactValue;
  }

  const lines = Array.from(cart.values()).map(
    (item) => `- ${item.title} (${item.category}) x${item.quantity} @ ${formatPrice(item.price)}`
  );
  const summaryLines = Array.from(cart.values()).map(
    (item) => `${item.title} x${item.quantity} - ${formatPrice(item.price)}`
  );
  const totalCost = Array.from(cart.values()).reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryBlock = orderType === "Delivery"
    ? `\nDelivery Name: ${deliveryInfo.name}\nDelivery Contact: ${deliveryInfo.contact}\nDelivery Address: ${deliveryInfo.address}\n`
    : `\nPickup Name: ${pickupInfo.name}\nPickup Contact: ${pickupInfo.contact}\nPickup Number: ${pickupInfo.number}\n`;
  const orderId = generateOrderId();
  const message = `Order ID: ${orderId}\nOrder Type: ${orderType}\nTotal: ${formatPrice(totalCost)}${deliveryBlock}\nItems:\n${lines.join("\n")}`;

  try {
    showLoading();
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      mode: "no-cors",
      body: JSON.stringify({
        order_id: orderId,
        order_type: orderType,
        customer_name: orderType === "Delivery" ? deliveryInfo.name : pickupInfo.name,
        address: orderType === "Delivery" ? deliveryInfo.address : "",
        contact_number: orderType === "Delivery" ? deliveryInfo.contact : pickupInfo.contact,
        pickup_number: orderType === "Pickup" ? pickupInfo.number : "",
        items: lines.join("\n"),
        total: formatPrice(totalCost),
        message
      })
    });

    orderStatusEl.textContent = "Order sent successfully.";
    cart.clear();
    cards.forEach((card) => card.classList.remove("selected"));
    orderForm.reset();
    deliveryInfo.name = "";
    deliveryInfo.contact = "";
    deliveryInfo.address = "";
    pickupInfo.name = "";
    pickupInfo.contact = "";
    pickupInfo.number = "";
    renderOrder();
    closeOrderModal();
    hideLoading();
    successOrderIdEl.textContent = `Order ID: ${orderId}`;
    successSummaryEl.innerHTML = summaryLines.map((line) => `<li>${line}</li>`).join("");
    const totalLine = document.createElement("li");
    totalLine.textContent = `Total: ${formatPrice(totalCost)}`;
    successSummaryEl.appendChild(totalLine);
    successCancelBtn.dataset.cancelUrl = `${APPS_SCRIPT_URL}?cancel=${orderId}`;
    showSuccess();
  } catch (error) {
    orderStatusEl.textContent = "Network error. Try again.";
    closeOrderModal();
    hideLoading();
  }
});
