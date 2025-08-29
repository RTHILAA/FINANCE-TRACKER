let transactions = [];
let totalIncome = 0;
let totalExpense = 0;
let totalBalance = 0;
let sortDirection = { date: "desc", amount: "desc" };
let currentSort = null;
let isEditing = false;
let currentEditId = null;

// Category colors mapping
const categoryColors = {
  salary: "text-green-600",
  freelance: "text-info",
  food: "text-warning",
  transport: "text-yellow-500",
  shopping: "text-indigo-600",
  entertainment: "text-orange-500",
  bills: "text-secondary",
  other: "text-gray-600",
};

// Category expenses tracking
const categoryExpenses = {
  salary: 0,
  freelance: 0,
  food: 0,
  transport: 0,
  shopping: 0,
  entertainment: 0,
  bills: 0,
  other: 0,
};

// Category income tracking
const categoryIncome = {
  salary: 0,
  freelance: 0,
  food: 0,
  transport: 0,
  shopping: 0,
  entertainment: 0,
  bills: 0,
  other: 0,
};

// Set today's date as default
document.getElementById("date").valueAsDate = new Date();

// Initialize event listeners
function initEventListeners() {
  // Form submission
  document
    .getElementById("transactionForm")
    .addEventListener("submit", handleFormSubmit);

  // Clear all transactions
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllTransactions);

  // Sorting buttons
  document
    .getElementById("sortDate")
    .addEventListener("click", () => sortTransactions("date"));
  document
    .getElementById("sortAmount")
    .addEventListener("click", () => sortTransactions("amount"));

  // Filter inputs
  document
    .getElementById("filterType")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterCategory")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterDateFrom")
    .addEventListener("change", applyFilters);
  document
    .getElementById("filterDateTo")
    .addEventListener("change", applyFilters);
  document
    .getElementById("searchInput")
    .addEventListener("input", applyFilters);

  // Reset filters
  document
    .getElementById("resetFilters")
    .addEventListener("click", resetFilters);

  // Cancel edit button
  document
    .getElementById("cancelEditButton")
    .addEventListener("click", cancelEdit);
}

// Show toast notification
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  toastMessage.textContent = message;
  toast.classList.remove("hidden");

  if (isError) {
    toast.classList.add("error");
  } else {
    toast.classList.remove("error");
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 500);
  }, 3000);
}

// Animate number counting
function animateValue(element, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = progress * (end - start) + start;
    element.textContent = `$${value.toFixed(2)}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Save data to localStorage
function saveToLocalStorage() {
  const data = {
    transactions,
    totalIncome,
    totalExpense,
    totalBalance,
    categoryExpenses,
    categoryIncome,
  };
  localStorage.setItem("expenseTrackerData", JSON.stringify(data));
}

// Load data from localStorage
function loadFromLocalStorage() {
  const data = JSON.parse(localStorage.getItem("expenseTrackerData"));
  if (data) {
    transactions = data.transactions || [];
    totalIncome = data.totalIncome || 0;
    totalExpense = data.totalExpense || 0;
    totalBalance = data.totalBalance || 0;

    // Restore category expenses
    if (data.categoryExpenses) {
      for (const category in data.categoryExpenses) {
        if (categoryExpenses.hasOwnProperty(category)) {
          categoryExpenses[category] = data.categoryExpenses[category];
        }
      }
    }

    // Restore category income
    if (data.categoryIncome) {
      for (const category in data.categoryIncome) {
        if (categoryIncome.hasOwnProperty(category)) {
          categoryIncome[category] = data.categoryIncome[category];
        }
      }
    }

    // Update UI
    updateSummaryCards();
    updateCategoryExpenses();
    updateIncomeByCategory();
    renderTransactions();
  }
}

// Handle form submission
function handleFormSubmit(e) {
  e.preventDefault();

  // Get form values
  const description = document.getElementById("description").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    document.getElementById("amount").classList.add("shake");
    showToast("Please enter a valid amount", true);
    setTimeout(() => {
      document.getElementById("amount").classList.remove("shake");
    }, 600);
    return;
  }

  if (isEditing) {
    // Update existing transaction
    updateTransaction(currentEditId, description, amount, type, category, date);
  } else {
    // Create new transaction object
    const transaction = {
      id: Date.now(), // Unique ID
      description,
      amount,
      type,
      category,
      date,
    };

    // Add to transactions array
    transactions.unshift(transaction);

    // Update totals
    if (type === "income") {
      totalIncome += amount;
      totalBalance += amount;

      // Update category income
      if (categoryIncome.hasOwnProperty(category)) {
        categoryIncome[category] += amount;
      } else {
        categoryIncome.other += amount;
      }
    } else {
      totalExpense += amount;
      totalBalance -= amount;

      // Update category expenses
      if (categoryExpenses.hasOwnProperty(category)) {
        categoryExpenses[category] += amount;
      } else {
        categoryExpenses.other += amount;
      }
    }

    // Show success message
    showToast("Transaction added successfully!");
  }

  // Update UI
  updateSummaryCards(true);
  updateCategoryExpenses();
  updateIncomeByCategory();
  renderTransactions();

  // Save to localStorage
  saveToLocalStorage();

  // Reset form
  resetForm();
}

// Update an existing transaction
function updateTransaction(id, description, amount, type, category, date) {
  const transactionIndex = transactions.findIndex((t) => t.id === id);
  if (transactionIndex === -1) return;

  const oldTransaction = transactions[transactionIndex];
  const oldAmount = oldTransaction.amount;
  const oldType = oldTransaction.type;
  const oldCategory = oldTransaction.category;

  // Update the transaction
  transactions[transactionIndex] = {
    id,
    description,
    amount,
    type,
    category,
    date,
  };

  // Reverse the old transaction's impact on totals
  if (oldType === "income") {
    totalIncome -= oldAmount;
    totalBalance -= oldAmount;

    // Update category income
    if (categoryIncome.hasOwnProperty(oldCategory)) {
      categoryIncome[oldCategory] -= oldAmount;
    }
  } else {
    totalExpense -= oldAmount;
    totalBalance += oldAmount;

    // Update category expenses
    if (categoryExpenses.hasOwnProperty(oldCategory)) {
      categoryExpenses[oldCategory] -= oldAmount;
    }
  }

  // Apply the new transaction's impact on totals
  if (type === "income") {
    totalIncome += amount;
    totalBalance += amount;

    // Update category income
    if (categoryIncome.hasOwnProperty(category)) {
      categoryIncome[category] += amount;
    } else {
      categoryIncome.other += amount;
    }
  } else {
    totalExpense += amount;
    totalBalance -= amount;

    // Update category expenses
    if (categoryExpenses.hasOwnProperty(category)) {
      categoryExpenses[category] += amount;
    } else {
      categoryExpenses.other += amount;
    }
  }

  // Show success message
  showToast("Transaction updated successfully!");

  // Exit edit mode
  cancelEdit();
}

// Reset form to default state
function resetForm() {
  document.getElementById("transactionForm").reset();
  document.getElementById("date").valueAsDate = new Date();
  isEditing = false;
  currentEditId = null;

  // Update UI for form
  document.getElementById("formTitle").textContent = "Add Transaction";
  document.getElementById("submitButton").textContent = "Add Transaction";
  document.getElementById("cancelEditButton").classList.add("hidden");
}

// Cancel edit mode
function cancelEdit() {
  resetForm();
  showToast("Edit cancelled");
}

// Update summary cards
function updateSummaryCards(animate = false) {
  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const totalBalanceEl = document.getElementById("totalBalance");

  if (animate) {
    animateValue(
      totalIncomeEl,
      parseFloat(totalIncomeEl.textContent.replace("$", "")),
      totalIncome,
      800
    );
    animateValue(
      totalExpenseEl,
      parseFloat(totalExpenseEl.textContent.replace("$", "")),
      totalExpense,
      800
    );
    animateValue(
      totalBalanceEl,
      parseFloat(totalBalanceEl.textContent.replace("$", "")),
      totalBalance,
      800
    );
  } else {
    totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    totalExpenseEl.textContent = `$${totalExpense.toFixed(2)}`;
    totalBalanceEl.textContent = `$${totalBalance.toFixed(2)}`;
  }

  document.getElementById(
    "monthlyIncome"
  ).textContent = `+$${totalIncome.toFixed(2)}`;
  document.getElementById(
    "monthlyExpenses"
  ).textContent = `-$${totalExpense.toFixed(2)}`;
  document.getElementById(
    "monthlyBalance"
  ).textContent = `$${totalBalance.toFixed(2)}`;
}

// Update category expenses display
function updateCategoryExpenses() {
  const container = document.getElementById("categoryExpenses");

  // Check if there are any expenses
  const hasExpenses = Object.values(categoryExpenses).some(
    (value) => value > 0
  );

  if (!hasExpenses) {
    container.innerHTML = `
                    <div class="text-center text-gray-500 py-4">
                        <i class="fas fa-receipt text-4xl text-gray-300 mb-3"></i>
                        <p>No expense data yet</p>
                    </div>
                `;
    return;
  }

  // Calculate total expenses
  const totalExpenseValue = Object.values(categoryExpenses).reduce(
    (sum, value) => sum + value,
    0
  );

  // Generate HTML for each category
  let html = "";
  for (const [category, amount] of Object.entries(categoryExpenses)) {
    if (amount > 0) {
      const percentage = ((amount / totalExpenseValue) * 100).toFixed(1);
      const iconClass = getCategoryIcon(category);
      const colorClass = categoryColors[category] || "text-gray-600";

      html += `
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <div class="flex items-center">
                                    <i class="${iconClass} ${colorClass} mr-2"></i>
                                    <span class="text-sm font-medium capitalize">${category}</span>
                                </div>
                                <span class="text-sm font-semibold">$${amount.toFixed(
                                  2
                                )}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${getCategoryBgColor(
                                  category
                                )}" style="width: ${percentage}%"></div>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500">
                                <span>${percentage}%</span>
                                <span>$${amount.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
    }
  }

  container.innerHTML = html;
}

// Update income by category display
function updateIncomeByCategory() {
  const container = document.getElementById("incomeByCategory");

  // Check if there is any income
  const hasIncome = Object.values(categoryIncome).some((value) => value > 0);

  if (!hasIncome) {
    container.innerHTML = `
                    <div class="text-center text-gray-500 py-4">
                        <i class="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                        <p>No income data yet</p>
                    </div>
                `;
    return;
  }

  // Calculate total income
  const totalIncomeValue = Object.values(categoryIncome).reduce(
    (sum, value) => sum + value,
    0
  );

  // Generate HTML for each category
  let html = "";
  for (const [category, amount] of Object.entries(categoryIncome)) {
    if (amount > 0) {
      const percentage = ((amount / totalIncomeValue) * 100).toFixed(1);
      const iconClass = getCategoryIcon(category);
      const colorClass = categoryColors[category] || "text-gray-600";

      html += `
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <div class="flex items-center">
                                    <i class="${iconClass} ${colorClass} mr-2"></i>
                                    <span class="text-sm font-medium capitalize">${category}</span>
                                </div>
                                <span class="text-sm font-semibold text-success">+$${amount.toFixed(
                                  2
                                )}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${getCategoryBgColor(
                                  category
                                )}" style="width: ${percentage}%"></div>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500">
                                <span>${percentage}%</span>
                                <span>+$${amount.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
    }
  }

  container.innerHTML = html;
}

// Get icon class for a category
function getCategoryIcon(category) {
  const icons = {
    salary: "fas fa-money-check-dollar",
    freelance: "fas fa-laptop-code",
    food: "fas fa-utensils",
    transport: "fas fa-bus",
    shopping: "fas fa-shopping-bag",
    entertainment: "fas fa-film",
    bills: "fas fa-file-invoice-dollar",
    other: "fas fa-question-circle",
  };

  return icons[category] || icons.other;
}

// Get background color for a category
function getCategoryBgColor(category) {
  const bgColors = {
    salary: "bg-green-600",
    freelance: "bg-info",
    food: "bg-warning",
    transport: "bg-yellow-500",
    shopping: "bg-indigo-600",
    entertainment: "bg-orange-500",
    bills: "bg-secondary",
    other: "bg-gray-600",
  };

  return bgColors[category] || "bg-gray-600";
}

// Render transactions list
function renderTransactions() {
  const container = document.getElementById("transactionList");

  if (transactions.length === 0) {
    container.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-receipt text-4xl text-gray-300 mb-3"></i>
                            <p>No transactions yet</p>
                        </td>
                    </tr>
                `;
    return;
  }

  // Apply filters
  let filteredTransactions = [...transactions];

  // Filter by type
  const typeFilter = document.getElementById("filterType").value;
  if (typeFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.type === typeFilter
    );
  }

  // Filter by category
  const categoryFilter = document.getElementById("filterCategory").value;
  if (categoryFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.category === categoryFilter
    );
  }

  // Filter by date range
  const dateFrom = document.getElementById("filterDateFrom").value;
  const dateTo = document.getElementById("filterDateTo").value;

  if (dateFrom) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.date >= dateFrom
    );
  }

  if (dateTo) {
    filteredTransactions = filteredTransactions.filter((t) => t.date <= dateTo);
  }

  // Filter by search text
  const searchText = document.getElementById("searchInput").value.toLowerCase();
  if (searchText) {
    filteredTransactions = filteredTransactions.filter((t) =>
      t.description.toLowerCase().includes(searchText)
    );
  }

  // Check if there are transactions after filtering
  if (filteredTransactions.length === 0) {
    container.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                            <p>No transactions match your filters</p>
                        </td>
                    </tr>
                `;
    return;
  }

  // Generate HTML for each transaction
  let html = "";
  filteredTransactions.forEach((transaction) => {
    const isIncome = transaction.type === "income";
    const iconClass = getCategoryIcon(transaction.category);
    const colorClass = categoryColors[transaction.category] || "text-gray-600";
    const formattedDate = new Date(transaction.date).toLocaleDateString();

    html += `
                    <tr class="transaction-item fade-in" data-id="${
                      transaction.id
                    }">
                        <td class="px-4 py-3 whitespace-nowrap md-table-cell sm-table-cell">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                    <i class="${iconClass} ${colorClass}"></i>
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${
                                      transaction.description
                                    }</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize md-table-cell sm-table-cell sm-hidden">
                            ${transaction.category}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 md-table-cell sm-table-cell">
                            ${formattedDate}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium md-table-cell sm-table-cell ${
                          isIncome ? "text-success" : "text-danger"
                        }">
                            ${
                              isIncome ? "+" : "-"
                            }$${transaction.amount.toFixed(2)}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium md-table-cell sm-table-cell">
                            <button class="text-blue-600 hover:text-blue-900 mr-3 edit-btn" data-id="${
                              transaction.id
                            }">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="text-red-600 hover:text-red-900 delete-btn" data-id="${
                              transaction.id
                            }">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
  });

  container.innerHTML = html;

  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-id"));
      deleteTransaction(id);
    });
  });

  // Add event listeners to edit buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.getAttribute("data-id"));
      editTransaction(id);
    });
  });
}

// Delete a transaction
function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  const transactionIndex = transactions.findIndex((t) => t.id === id);
  if (transactionIndex === -1) return;

  const transaction = transactions[transactionIndex];

  // Update totals
  if (transaction.type === "income") {
    totalIncome -= transaction.amount;
    totalBalance -= transaction.amount;

    // Update category income
    if (categoryIncome.hasOwnProperty(transaction.category)) {
      categoryIncome[transaction.category] -= transaction.amount;
    }
  } else {
    totalExpense -= transaction.amount;
    totalBalance += transaction.amount;

    // Update category expenses
    if (categoryExpenses.hasOwnProperty(transaction.category)) {
      categoryExpenses[transaction.category] -= transaction.amount;
    }
  }

  // Remove from transactions array
  transactions.splice(transactionIndex, 1);

  // Update UI
  updateSummaryCards(true);
  updateCategoryExpenses();
  updateIncomeByCategory();
  renderTransactions();

  // Save to localStorage
  saveToLocalStorage();

  // Show success message
  showToast("Transaction deleted successfully!");
}

// Edit a transaction
function editTransaction(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  // Populate form with transaction data
  document.getElementById("description").value = transaction.description;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("type").value = transaction.type;
  document.getElementById("category").value = transaction.category;
  document.getElementById("date").value = transaction.date;
  document.getElementById("editId").value = id;

  // Update UI for edit mode
  document.getElementById("formTitle").textContent = "Edit Transaction";
  document.getElementById("submitButton").textContent = "Update Transaction";
  document.getElementById("cancelEditButton").classList.remove("hidden");

  // Set editing state
  isEditing = true;
  currentEditId = id;

  // Scroll to form
  document
    .getElementById("transactionForm")
    .scrollIntoView({ behavior: "smooth" });

  // Show message
  showToast("Editing transaction. Make your changes and click Update.");
}

// Sort transactions
function sortTransactions(criteria) {
  // Toggle sort direction
  sortDirection[criteria] = sortDirection[criteria] === "asc" ? "desc" : "asc";

  // Update active sort button
  if (currentSort) {
    currentSort.classList.remove("active-sort");
  }

  currentSort = document.getElementById(
    `sort${criteria.charAt(0).toUpperCase() + criteria.slice(1)}`
  );
  currentSort.classList.add("active-sort");

  // Sort transactions
  transactions.sort((a, b) => {
    let valueA, valueB;

    if (criteria === "date") {
      valueA = new Date(a.date).getTime();
      valueB = new Date(b.date).getTime();
    } else {
      valueA = a.amount;
      valueB = b.amount;
    }

    if (sortDirection[criteria] === "asc") {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });

  // Update UI
  renderTransactions();
}

// Apply filters to transactions
function applyFilters() {
  renderTransactions();
}

// Reset all filters
function resetFilters() {
  document.getElementById("filterType").value = "all";
  document.getElementById("filterCategory").value = "all";
  document.getElementById("filterDateFrom").value = "";
  document.getElementById("filterDateTo").value = "";
  document.getElementById("searchInput").value = "";

  renderTransactions();
}

// Clear all transactions
function clearAllTransactions() {
  if (transactions.length === 0) {
    showToast("No transactions to clear", true);
    return;
  }

  if (
    !confirm(
      "Are you sure you want to clear all transactions? This action cannot be undone."
    )
  )
    return;

  // Reset all data
  transactions = [];
  totalIncome = 0;
  totalExpense = 0;
  totalBalance = 0;

  // Reset category expenses
  for (const category in categoryExpenses) {
    categoryExpenses[category] = 0;
  }

  // Reset category income
  for (const category in categoryIncome) {
    categoryIncome[category] = 0;
  }

  // Update UI
  updateSummaryCards(true);
  updateCategoryExpenses();
  updateIncomeByCategory();
  renderTransactions();

  // Save to localStorage
  saveToLocalStorage();

  // Show success message
  showToast("All transactions cleared successfully!");
}

// Initialize the application
function init() {
  initEventListeners();
  loadFromLocalStorage();
  renderTransactions();
}

// Start the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
