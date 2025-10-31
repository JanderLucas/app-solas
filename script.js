const form = document.getElementById('form');
const tabela = document.querySelector('#tabela tbody');
const exportarBtn = document.getElementById('exportar');
const limparBtn = document.getElementById('limpar');
const adicionarNumeracaoBtn = document.getElementById('adicionarNumeracao');
const numeracoesLista = document.getElementById('numeracoes-lista');
const filtroProduto = document.getElementById('filtroProduto');
const filtroCor = document.getElementById('filtroCor');

let registros = JSON.parse(localStorage.getItem('registros')) || [];

function formatarNumeracao(valor) {
  valor = valor.toString().trim();
  if (valor.length === 2) return '0' + valor + '0';
  if (valor.length === 3) return '0' + valor;
  if (valor.length === 1) return valor.padStart(4, '0');
  return valor;
}

function gerarItem(produto, cor, numeracao) {
  return `${produto}${cor.toUpperCase()}${numeracao}`;
}

function atualizarTabela() {
  tabela.innerHTML = '';
  const fp = filtroProduto.value.trim().toUpperCase();
  const fc = filtroCor.value.trim().toUpperCase();

  const registrosFiltrados = registros
    .map((r, index) => ({ ...r, realIndex: index }))
    .filter(r =>
      (!fp || r.produto.includes(fp)) &&
      (!fc || r.cor.includes(fc))
    );

  registrosFiltrados.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.produto}</td>
      <td>${item.cor}</td>
      <td>${item.numeracao}</td>
      <td>
        <div class="quantidade-controles">
          <button onclick="alterarQtd(${item.realIndex}, -1)">-</button>
          <span>${item.quantidade}</span>
          <button onclick="alterarQtd(${item.realIndex}, 1)">+</button>
        </div>
      </td>
      <td>${item.item}</td>
      <td>
        <button class="btn-editar" onclick="editarRegistro(${item.realIndex})">✏️</button>
        <button class="btn-excluir" onclick="excluirRegistro(${item.realIndex})">🗑️</button>
      </td>`;
    tabela.appendChild(tr);
  });
}

adicionarNumeracaoBtn.addEventListener('click', () => {
  const div = document.createElement('div');
  div.className = 'numeracao-linha';
  div.innerHTML = `
    <input type="number" class="numeracao" placeholder="Numeração" max="999" required />
    <input type="number" class="quantidade" placeholder="Qtd" min="1" required />
    <button type="button" class="remover">❌</button>
  `;
  div.querySelector('.remover').addEventListener('click', () => div.remove());
  numeracoesLista.appendChild(div);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const produto = document.getElementById('produto').value.trim();
  const cor = document.getElementById('cor').value.trim().toUpperCase();
  const linhas = document.querySelectorAll('.numeracao-linha');

  if (!produto || !cor || linhas.length === 0) {
    alert('Preencha todos os campos e adicione pelo menos uma numeração.');
    return;
  }

  if (produto.length > 5) return alert('Produto: máximo 5 dígitos.');
  if (isNaN(produto)) return alert('Produto deve conter apenas números.');
  if (cor.length > 5) return alert('Cor: máximo 5 caracteres.');

  linhas.forEach(linha => {
    let numeracao = linha.querySelector('.numeracao').value.trim();
    let quantidade = parseInt(linha.querySelector('.quantidade').value);
    if (!numeracao || quantidade < 1) return;
    numeracao = formatarNumeracao(numeracao);
    const item = gerarItem(produto, cor, numeracao);

    const existente = registros.find(r => r.item === item);
    if (existente) {
      const confirmar = confirm(`O item "${item}" já existe. Deseja somar ${quantidade} à quantidade atual (${existente.quantidade})?`);
      if (confirmar) existente.quantidade += quantidade;
    } else {
      registros.push({ produto, cor, numeracao, item, quantidade });
    }
  });

  localStorage.setItem('registros', JSON.stringify(registros));
  atualizarTabela();
  form.reset();
  numeracoesLista.innerHTML = '';
});

function alterarQtd(i, delta) {
  registros[i].quantidade += delta;
  if (registros[i].quantidade < 1) registros[i].quantidade = 1;
  localStorage.setItem('registros', JSON.stringify(registros));
  atualizarTabela();
}

function editarRegistro(index) {
  const registro = registros[index];
  const produto = prompt('Editar Produto:', registro.produto);
  if (!produto || produto.length > 5 || isNaN(produto)) return alert('Produto inválido.');

  const cor = prompt('Editar Cor:', registro.cor);
  if (!cor || cor.length > 5) return alert('Cor inválida.');

  let numeracao = prompt('Editar Numeração:', registro.numeracao.slice(-3));
  if (!numeracao || numeracao.length > 3) return alert('Numeração inválida.');
  numeracao = formatarNumeracao(numeracao);

  const item = gerarItem(produto, cor, numeracao);
  const duplicado = registros.find((r, i) => r.item === item && i !== index);
  if (duplicado) return alert('Já existe um item com esse mesmo código.');

  registros[index] = { ...registro, produto, cor, numeracao, item };
  localStorage.setItem('registros', JSON.stringify(registros));
  atualizarTabela();
}

function excluirRegistro(index) {
  if (confirm('Deseja excluir este registro?')) {
    registros.splice(index, 1);
    localStorage.setItem('registros', JSON.stringify(registros));
    atualizarTabela();
  }
}

limparBtn.addEventListener('click', () => {
  if (registros.length === 0) return alert('Nenhum registro para limpar.');
  if (confirm('Tem certeza que deseja apagar todos os registros?')) {
    registros = [];
    localStorage.removeItem('registros');
    atualizarTabela();
  }
});

exportarBtn.addEventListener('click', () => {
  if (registros.length === 0) return alert('Nenhum registro para exportar.');
  const ws = XLSX.utils.json_to_sheet(registros);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  XLSX.writeFile(wb, 'registros_CO_R.xlsx');
});

[filtroProduto, filtroCor].forEach(el => el.addEventListener('input', atualizarTabela));
atualizarTabela();
