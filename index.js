(function () {
  "use strict";

  // Amazon-specific selectors
  const amazonSelectors = {
    name: "#productTitle",
    price: "#corePrice_feature_div .a-offscreen",
    image: "#landingImage",
  };

  // Function to find element by selector
  function findElement(selector) {
    return document.querySelector(selector);
  }

  // Extract product information from Amazon
  function extractProductInfo() {
    // Product name
    let name = "";
    const nameElement = findElement(amazonSelectors.name);
    if (nameElement) {
      name = nameElement.textContent.trim();
    } else {
      // Fallback to page title
      name = document.title.replace(/[-|–]/, "").trim();
    }

    // Price
    let price = 0;
    const priceElement = findElement(amazonSelectors.price);
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.getAttribute("content") || "";
      // Extract numbers and handle Polish format (comma as decimal separator)
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        let priceStr = priceMatch[0];
        // Convert Polish format: 350,00 -> 350.00
        if (priceStr.includes(",")) {
          priceStr = priceStr.replace(",", ".");
        }
        price = parseFloat(priceStr);
      }
    }

    // Product image
    let imageUrl = "";
    const imageElement = findElement(amazonSelectors.image);
    if (imageElement) {
      imageUrl = imageElement.src || imageElement.getAttribute("data-src") || imageElement.getAttribute("data-old-hires");
    }

    // Generate unique product ID from URL
    const productId = window.location.href;

    return {
      id: productId,
      name: name || "Unknown Product",
      price: price,
      image: imageUrl,
      url: window.location.href,
    };
  }

  // Cart management class
  class CartManager {
    constructor() {
      this.cartKey = "cart";
    }

    getCart() {
      try {
        const cartData = localStorage.getItem(this.cartKey);
        return cartData ? JSON.parse(cartData) : {};
      } catch (e) {
        console.warn("Error loading cart:", e);
        return {};
      }
    }

    saveCart(cart) {
      try {
        localStorage.setItem(this.cartKey, JSON.stringify(cart));
        this.updateCartCount();
      } catch (e) {
        console.error("Error saving cart:", e);
      }
    }

    addProduct(product, quantity = 1) {
      const cart = this.getCart();

      if (cart[product.id]) {
        cart[product.id].quantity += quantity;
      } else {
        cart[product.id] = {
          ...product,
          quantity: quantity,
          addedAt: new Date().toISOString(),
        };
      }

      this.saveCart(cart);
      return cart;
    }

    updateQuantity(productId, newQuantity) {
      const cart = this.getCart();
      if (cart[productId]) {
        if (newQuantity <= 0) {
          delete cart[productId];
        } else {
          cart[productId].quantity = newQuantity;
        }
        this.saveCart(cart);
      }
      return cart;
    }

    removeProduct(productId) {
      const cart = this.getCart();
      delete cart[productId];
      this.saveCart(cart);
      return cart;
    }

    getTotalValue(cart) {
      return Object.values(cart || this.getCart()).reduce((total, product) => {
        return total + product.price * product.quantity;
      }, 0);
    }

    getItemCount(cart) {
      return Object.values(cart || this.getCart()).reduce((total, product) => {
        return total + product.quantity;
      }, 0);
    }

    updateCartCount() {
      const cart = this.getCart();
      const count = this.getItemCount(cart);
      const countElement = document.getElementById("cart-count");
      if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? "flex" : "none";
      }
    }
  }

  // Create cart manager instance
  const cartManager = new CartManager();

  // Create cart panel
  function createCartPanel() {
    const existingPanel = document.getElementById("universal-cart-panel");
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement("div");
    panel.id = "universal-cart-panel";
    panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 380px;
            max-height: 600px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            overflow: hidden;
            transform: translateY(-10px);
            opacity: 0;
            transition: all 0.3s ease;
        `;

    document.body.appendChild(panel);

    setTimeout(() => {
      panel.style.transform = "translateY(0)";
      panel.style.opacity = "1";
    }, 10);

    updateCartPanel();
    return panel;
  }

  // Update cart panel content
  function updateCartPanel() {
    const panel = document.getElementById("universal-cart-panel");
    if (!panel) return;

    const cart = cartManager.getCart();
    const products = Object.values(cart);
    const totalValue = cartManager.getTotalValue(cart);
    const itemCount = cartManager.getItemCount(cart);

    panel.innerHTML = `
            <div style="padding: 15px; background: #007bff; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>Shopping Cart (${itemCount} items)</span>
                <button id="close-cart" style="background: rgba(255,255,255,0.3); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;">&times;</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${
                  products.length === 0
                    ? '<div style="padding: 30px; text-align: center; color: #666;">Your cart is empty</div>'
                    : products
                        .map(
                          (product) => `
                        <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; gap: 12px;">
                            ${
                              product.image
                                ? `
                                <div style="flex-shrink: 0;">
                                    <img src="${product.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" onerror="this.style.display='none'">
                                </div>
                            `
                                : ""
                            }
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; margin-bottom: 8px; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;" title="${product.name}">${product.name}</div>

                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <span style="font-size: 12px; color: #666;">Quantity:</span>
                                    <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px;">
                                        <button onclick="changeQuantity('${product.id}', ${product.quantity - 1})" style="background: #f0f0f0; border: none; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s ease;" ${product.quantity <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ""}>−</button>
                                        <input type="number" value="${product.quantity}" min="1" max="999" onchange="changeQuantity('${product.id}', parseInt(this.value) || 1)" style="width: 40px; height: 23px; border: none; text-align: center; font-size: 12px; -moz-appearance: textfield;">
                                        <button onclick="changeQuantity('${product.id}', ${product.quantity + 1})" style="background: #f0f0f0; border: none; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s ease;">+</button>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                                    <span style="color: #666;">Unit price: <strong>${product.price.toFixed(2)} zł</strong></span>
                                    <span style="font-size: 14px; font-weight: bold; color: #007bff;">${(product.price * product.quantity).toFixed(2)} zł</span>
                                </div>
                            </div>
                            <div style="flex-shrink: 0;">
                                <button onclick="removeFromCart('${product.id}')" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; font-size: 11px; white-space: nowrap; transition: all 0.2s ease;">Remove</button>
                            </div>
                        </div>
                    `
                        )
                        .join("")
                }
            </div>
            ${
              products.length > 0
                ? `
                <div style="padding: 15px; background: #f8f9fa; border-top: 2px solid #007bff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: bold; color: #007bff;">
                        <span>Total:</span>
                        <span>${totalValue.toFixed(2)} zł</span>
                    </div>
                    <div style="margin-top: 10px; text-align: center;">
                        <button onclick="clearCart()" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 12px; margin-right: 10px;">Clear Cart</button>
                        <button style="background: #007bff; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 12px;">Checkout</button>
                    </div>
                </div>
            `
                : ""
            }
        `;

    // Event listener for close button
    const closeBtn = panel.querySelector("#close-cart");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        panel.style.transform = "translateY(-10px)";
        panel.style.opacity = "0";
        setTimeout(() => panel.remove(), 300);
      });
    }

    // Remove webkit-appearance for Firefox
    const numberInputs = panel.querySelectorAll('input[type="number"]');
    numberInputs.forEach((input) => {
      input.style.MozAppearance = "textfield";
    });
  }

  // Global functions
  window.changeQuantity = function (productId, newQuantity) {
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > 999) newQuantity = 999;

    cartManager.updateQuantity(productId, newQuantity);
    updateCartPanel();
  };

  window.removeFromCart = function (productId) {
    cartManager.removeProduct(productId);
    updateCartPanel();
    showNotification("Product removed from cart", "info");
  };

  window.clearCart = function () {
    if (confirm("Are you sure you want to clear the entire cart?")) {
      localStorage.removeItem("cart");
      updateCartPanel();
      cartManager.updateCartCount();
      showNotification("Cart has been cleared", "info");
    }
  };

  // Notification function
  function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === "success" ? "#28a745" : type === "info" ? "#17a2b8" : "#6c757d"};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10002;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
            text-align: center;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => (notification.style.opacity = "1"), 10);

    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(-50%) translateY(-10px)";
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  // Add current product to cart
  function addCurrentProduct() {
    const productInfo = extractProductInfo();

    if (!productInfo.name || productInfo.price <= 0) {
      showNotification("Could not extract product information. Make sure you are on a product page.", "info");
      return;
    }

    const cart = cartManager.getCart();
    const wasInCart = cart[productInfo.id] ? true : false;

    cartManager.addProduct(productInfo);
    createCartPanel();

    if (wasInCart) {
      showNotification(`Increased quantity of "${productInfo.name}" in cart!`);
    } else {
      showNotification(`Added "${productInfo.name}" to cart!`);
    }
  }

  // Create add to cart button
  function createAddToCartButton() {
    const existingBtn = document.getElementById("universal-add-to-cart");
    if (existingBtn) {
      existingBtn.remove();
    }

    const button = document.createElement("div");
    button.id = "universal-add-to-cart";
    button.innerHTML = `
            <button style="
                background: #007bff;
                color: white;
                border: none;
                border-radius: 25px;
                padding: 12px 20px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                transition: all 0.3s ease;
                font-family: Arial, sans-serif;
                position: relative;
                overflow: visible;
            ">
                Add to Cart
                <span id="cart-count" style="
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                ">0</span>
            </button>
        `;

    button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
        `;

    const btn = button.querySelector("button");
    btn.addEventListener("click", addCurrentProduct);

    document.body.appendChild(button);

    // Update counter
    cartManager.updateCartCount();
  }

  // Create show cart button
  function createShowCartButton() {
    const existingBtn = document.getElementById("show-universal-cart");
    if (existingBtn) return;

    const button = document.createElement("button");
    button.id = "show-universal-cart";
    button.textContent = "View Cart";
    button.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 16px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            z-index: 10001;
            font-family: Arial, sans-serif;
            transition: all 0.3s ease;
        `;

    button.addEventListener("click", () => {
      const existingPanel = document.getElementById("universal-cart-panel");
      if (existingPanel) {
        existingPanel.remove();
      } else {
        createCartPanel();
      }
    });

    document.body.appendChild(button);
  }

  // Create UI
  createAddToCartButton();
  createShowCartButton();

  // Show existing cart if not empty
  const existingCart = cartManager.getCart();
  const itemCount = cartManager.getItemCount(existingCart);

  if (itemCount > 0) {
    setTimeout(() => createCartPanel(), 1000);
  }
})();
