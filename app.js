// ------------------------
//  FIREBASE SETUP (imports in JS)
// ------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJgYP7JoYgRQqoW-ZP4qdtOzK09F_4Qx8",
  authDomain: "add-to-cart-app-f11fb.firebaseapp.com",
  projectId: "add-to-cart-app-f11fb",
  storageBucket: "add-to-cart-app-f11fb.appspot.com",
  messagingSenderId: "780900990198",
  appId: "1:780900990198:web:fdd29a541a3250955e00d7"
};

// initialize firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let uid = null;
let cart = {}; // structure: { productId: { qty: N, product: {..} } }

// ------------------------
//  PRODUCTS (unchanged)
// ------------------------
let products = [
  {id:'p1',name:'T-Shirt',price:20,image:'https://picsum.photos/300?1'},
  {id:'p2',name:'Jacket',price:50,image:'https://picsum.photos/300?2'},
  {id:'p3',name:'Sneakers',price:80,image:'https://picsum.photos/300?3'},
  {id:'p4',name:'Cap',price:12,image:'https://picsum.photos/300?4'},
  {id:'p5',name:'Hoodie',price:40,image:'https://picsum.photos/300?5'},
  {id:'p6',name:'Shirt',price:30,image:'https://picsum.photos/300?6'},
  {id:'p7',name:'Watch',price:100,image:'https://picsum.photos/300?7'},
  {id:'p8',name:'Backpack',price:35,image:'https://picsum.photos/300?8'},
  {id:'p9',name:'Earbuds',price:50,image:'https://picsum.photos/300?9'},
  {id:'p10',name:'Sunglasses',price:25,image:'https://picsum.photos/300?10'}
];

// ------------------------
//  DOM references
// ------------------------
const productsEl = document.getElementById("products");
const cartPanel = document.getElementById("cartPanel");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const subtotalEl = document.getElementById("subtotal");
const openCartBtn = document.getElementById("openCart");
const closeCartBtn = document.getElementById("closeCart");
const buyNowBtn = document.getElementById("buyNow");
const invoiceModal = document.getElementById("invoiceModal");
const invoiceBody = document.getElementById("invoiceBody");
const closeInvoiceBtn = document.getElementById("closeInvoice");

// ------------------------
//  Render product cards (basic for loop)
// ------------------------
function showProducts() {
  productsEl.innerHTML = "";

  for (let i = 0; i < products.length; i++) {
    let p = products[i];

    let card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${p.image}">
      <h3>${p.name}</h3>
      <div class="price">$${p.price}</div>
    `;

    let btn = document.createElement("button");
    btn.textContent = "Add to Cart";
    btn.className = "btn btn-accent card-btn";
    // attach handler
    btn.onclick = function() { addToCart(p.id); };

    card.appendChild(btn);
    productsEl.appendChild(card);
  }
}

// ------------------------
//  Add item to cart
// ------------------------
function addToCart(id) {
  // find product using basic for loop
  let found = null;
  for (let i = 0; i < products.length; i++) {
    if (products[i].id === id) { found = products[i]; break; }
  }
  if (!found) return;

  if (!cart[id]) {
    cart[id] = { qty: 1, product: found };
  } else {
    cart[id].qty++;
  }

  saveCart();   // persist
  renderCart(); // update UI
}

// ------------------------
//  Change quantity (plus/minus)
// ------------------------
function changeQty(id, delta) {
  if (!cart[id]) return;

  cart[id].qty = cart[id].qty + delta;
  if (cart[id].qty <= 0) {
    delete cart[id];
  }
  saveCart();
  renderCart();
}

// ------------------------
//  Remove item completely
// ------------------------
function removeItem(id) {
  if (cart[id]) {
    delete cart[id];
    saveCart();
    renderCart();
  }
}

// ------------------------
//  Render cart (basic for..in loop)
// ------------------------
function renderCart() {
  cartItemsEl.innerHTML = "";

  let total = 0;
  let count = 0;

  for (let id in cart) {
    if (!cart.hasOwnProperty(id)) continue;
    let item = cart[id];
    let price = item.qty * item.product.price;
    total += price;
    count += item.qty;

    let div = document.createElement("div");
    div.className = "cart-item";

    // Use inline onclick which requires the functions to be global (we expose them later)
    div.innerHTML = `
      <img src="${item.product.image}">
      <div>
        <strong>${item.product.name}</strong> x ${item.qty}<br>
        $${price.toFixed(2)}<br>

        <button class="btn" onclick="changeQty('${id}', 1)">+</button>
        <button class="btn" onclick="changeQty('${id}', -1)">-</button>
        <button class="btn" onclick="removeItem('${id}')">Remove</button>
      </div>
    `;
    cartItemsEl.appendChild(div);
  }

  cartCountEl.textContent = count;
  subtotalEl.textContent = total.toFixed(2);
}

// ------------------------
//  Save cart (localStorage + Firestore) using .then()
// ------------------------
function saveCart() {
  // localStorage always
  try {
    localStorage.setItem("cart", JSON.stringify(cart));
  } catch (e) {
    console.error("localStorage error:", e);
  }

  // if we have user id, save to Firestore
  if (uid) {
    // setDoc returns a Promise — use .then() to handle it
    setDoc(doc(db, "carts", uid), { items: cart })
      .then(function() {
        // saved successfully (we keep this quiet)
      })
      .catch(function(err) {
        console.error("Firestore save error:", err);
      });
  }
}

// ------------------------
//  Load cart (Firestore first if uid exists; fallback to localStorage) using .then()
// ------------------------
function loadCart() {
  if (uid) {
    getDoc(doc(db, "carts", uid))
      .then(function(docSnap) {
        if (docSnap.exists()) {
          // use saved items
          cart = docSnap.data().items || {};
        } else {
          // no server cart -> try localStorage
          try {
            cart = JSON.parse(localStorage.getItem("cart") || "{}");
          } catch (e) {
            cart = {};
          }
        }
        renderCart();
      })
      .catch(function(err) {
        console.error("Firestore read error:", err);
        // on error, fallback to localStorage
        try {
          cart = JSON.parse(localStorage.getItem("cart") || "{}");
        } catch (e) {
          cart = {};
        }
        renderCart();
      });
  } else {
    // no uid yet -> read from localStorage
    try {
      cart = JSON.parse(localStorage.getItem("cart") || "{}");
    } catch (e) {
      cart = {};
    }
    renderCart();
  }
}

// ------------------------
//  Buy now: create order, show invoice, download PDF
// ------------------------
function onBuyNow() {
  // empty cart check
  let keys = Object.keys(cart);
  if (keys.length === 0) {
    alert("Cart is empty");
    return;
  }

  let invoiceText = "";
  let total = 0;

  // iterate cart with for..in
  for (let id in cart) {
    if (!cart.hasOwnProperty(id)) continue;
    let it = cart[id];
    let price = it.qty * it.product.price;
    invoiceText += `${it.product.name} × ${it.qty} = $${price}\n`;
    total += price;
  }

  invoiceBody.innerHTML = invoiceText.replace(/\n/g, "<br>");
  invoiceModal.classList.add("open");

  // save order to Firestore (use .then())
  addDoc(collection(db, "orders"), {
    uid: uid,
    items: cart,
    total: total,
    created: new Date()
  })
  .then(function(docRef) {
    // order saved
    // (no further action required here)
  })
  .catch(function(err) {
    console.error("Order save error:", err);
  });

  // Create PDF using jspdf loaded in HTML (window.jspdf)
  try {
    const { jsPDF } = window.jspdf;
    let pdf = new jsPDF();
    pdf.text("Mini Shop Invoice", 20, 20);
    let y = 30;
    for (let id in cart) {
      if (!cart.hasOwnProperty(id)) continue;
      let it = cart[id];
      pdf.text(`${it.product.name} x ${it.qty} = $${(it.qty * it.product.price).toFixed(2)}`, 20, y);
      y += 10;
    }
    pdf.text(`Total: $${total.toFixed(2)}`, 20, y + 10);
    pdf.save("invoice.pdf");
  } catch (e) {
    console.error("PDF error:", e);
  }

  // clear cart
  cart = {};
  saveCart();
  renderCart();
}

// ------------------------
//  Auth watcher — no async/await, use .then() inside where needed
// ------------------------
onAuthStateChanged(auth, function(user) {
  if (user) {
    uid = user.uid;
    // load cart now that uid exists
    loadCart();
  } else {
    // sign in anonymously and then load cart when done
    signInAnonymously(auth)
      .then(function(result) {
        // after sign-in, onAuthStateChanged will also fire and set uid + loadCart
      })
      .catch(function(err) {
        console.error("Anonymous sign-in failed:", err);
      });
  }
});

// ------------------------
//  UI event bindings
// ------------------------
openCartBtn.onclick = function() { cartPanel.classList.add("open"); };
closeCartBtn.onclick = function() { cartPanel.classList.remove("open"); };
buyNowBtn.onclick = onBuyNow;
closeInvoiceBtn.onclick = function() { invoiceModal.classList.remove("open"); };

// ------------------------
//  Init (render + load)
// ------------------------
showProducts();
loadCart();

// expose functions for inline onclick in generated HTML
window.changeQty = changeQty;
window.removeItem = removeItem;
window.addToCart = addToCart;
