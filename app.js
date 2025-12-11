// ------------------------
//  FIREBASE SETUP
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

// start firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

let uid = null;   // will store user ID
let cart = {};    // all cart items

// ------------------------
//  PRODUCTS
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
//  HTML ELEMENTS
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
//  RENDER PRODUCTS
// ------------------------
function showProducts() {
  productsEl.innerHTML = "";

  products.forEach(p => {
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

    btn.onclick = () => addToCart(p.id);

    card.appendChild(btn);
    productsEl.appendChild(card);
  });
}

// ------------------------
//  ADD ITEM TO CART
// ------------------------
function addToCart(id) {
  let p = products.find(x => x.id === id);

  if (!cart[id]) {
    cart[id] = { qty: 1, product: p };
  } else {
    cart[id].qty++;
  }

  saveCart();
  renderCart();
}

// ------------------------
//  CHANGE QUANTITY
// ------------------------
function changeQty(id, value) {
  if (!cart[id]) return;

  cart[id].qty += value;

  if (cart[id].qty <= 0) {
    delete cart[id];
  }

  saveCart();
  renderCart();
}

// ------------------------
//  REMOVE ITEM
// ------------------------
function removeItem(id) {
  delete cart[id];
  saveCart();
  renderCart();
}

// ------------------------
//  SHOW CART
// ------------------------
function renderCart() {
  cartItemsEl.innerHTML = "";

  let total = 0;
  let count = 0;

  for (let id in cart) {
    let item = cart[id];
    let price = item.qty * item.product.price;

    total += price;
    count += item.qty;

    let div = document.createElement("div");
    div.className = "cart-item";

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
//  SAVE CART (FIRESTORE + LOCAL)
// ------------------------
async function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));

  if (uid) {
    await setDoc(doc(db, "carts", uid), { items: cart });
  }
}

// ------------------------
//  LOAD CART
// ------------------------
async function loadCart() {
  if (uid) {
    let docSnap = await getDoc(doc(db, "carts", uid));
    if (docSnap.exists()) {
      cart = docSnap.data().items || {};
    }
  } else {
    cart = JSON.parse(localStorage.getItem("cart") || "{}");
  }

  renderCart();
}

// ------------------------
//  BUY NOW + PDF
// ------------------------
function onBuyNow() {
  if (Object.keys(cart).length === 0) {
    alert("Cart is empty");
    return;
  }

  let text = "";
  let total = 0;

  for (let id in cart) {
    let item = cart[id];
    let price = item.qty * item.product.price;

    text += `${item.product.name} × ${item.qty} = $${price}\n`;
    total += price;
  }

  invoiceBody.innerHTML = text.replace(/\n/g, "<br>");
  invoiceModal.classList.add("open");

  addDoc(collection(db, "orders"), {
    uid,
    items: cart,
    total,
    created: new Date()
  });

  // PDF
  const { jsPDF } = window.jspdf;
  let pdf = new jsPDF();
  pdf.text("Mini Shop Invoice", 20, 20);

  let y = 30;
  for (let id in cart) {
    let item = cart[id];
    pdf.text(`${item.product.name} x ${item.qty}`, 20, y);
    y += 10;
  }

  pdf.text(`Total: $${total}`, 20, y + 10);
  pdf.save("invoice.pdf");

  cart = {};
  saveCart();
  renderCart();
}

// ------------------------
//  FIREBASE AUTH
// ------------------------
onAuthStateChanged(auth, user => {
  if (user) {
    uid = user.uid;
    loadCart();
  } else {
    signInAnonymously(auth);
  }
});

// ------------------------
//  BUTTON EVENTS
// ------------------------
openCartBtn.onclick = () => cartPanel.classList.add("open");
closeCartBtn.onclick = () => cartPanel.classList.remove("open");
buyNowBtn.onclick = onBuyNow;
closeInvoiceBtn.onclick = () => invoiceModal.classList.
remove("open");

// ------------------------
//  INIT
// ------------------------
showProducts();
loadCart();

// expose functions to HTML onclick
window.changeQty = changeQty;
window.removeItem = removeItem;
window.addToCart = addToCart;



