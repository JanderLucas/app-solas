const form = document.getElementById('form');
const tabela = document.querySelector('#tabela tbody');
const exportarBtn = document.getElementById('exportar');
const limparBtn = document.getElementById('limpar');
const filtroProduto = document.getElementById('filtroProduto');
const filtroCor = document.getElementById('filtroCor');
const filtroItem = document.getElementById('filtroItem');

let registros = JSON.parse(localStorage.getItem('registros')) || [];

function formatarNumeracao(valor) {
  valor = valor.toString().trim();
  if (valor.length === 2) return '0' + valor + '0';
  if (valor.length === 3) return '0' + valor;
  if (valor.length === 1) return valor.padStart(4, '0');
  return valor;
}

function gerarItem(produto, cor, numeracao) {
  return `${produto.toUpperCase()}${cor.toUpperCase()}${numeracao}`;
}

function atualizarTabela() {
  tabela.innerHTML = '';

  const filtroP = filtroProduto.value.trim().toUpperCase();
  const filtroC = filtroCor.value.trim().toUpperCase();
  const filtroI = filtroItem.value.trim().toUpperCase();

  registros
    .filter(r =>
      (!filtroP || r.produto.includes(filtroP)) &&
      (!filtroC || r.cor.includes(filtroC)) &&
      (!filtroI || r.item.includes(filtroI))
    )
    .forEach((item, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.produto}</td>
        <td>${item.cor}</td>
        <td>${item.numeracao}</td>
        <td>${item.item}</td>
        <td>
          <div class="quantidade-controles">
            <button onclick="alterarQtd(${i}, -1)">-</button>
            <span>${item.quantidade}</span>
            <button onclick="alterarQtd(${i}, 1)">+</button>
          </div>
        </td>
        <td>
          <button class="btn-editar" onclick="editarRegistro(${i})">✏️ Editar</button>
          <button class="btn-excluir" onclick="excluirRegistro(${i})">Excluir</button>
        </td>
      `;
      tabela.appendChild(tr);
    });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const produto = document.getElementById('produto').value.trim().toUpperCase();
  const cor = document.getElementById('cor').value.trim().toUpperCase();
  let numeracao = document.getElementById('numeracao').value.trim();
  const quantidade = parseInt(document.getElementById('quantidade').value);

  if (!produto || !cor || !numeracao || !quantidade)
    return alert('Preencha todos os campos.');

  if (produto.length > 5) return alert('Produto: máximo 5 caracteres.');
  if (cor.length > 5) return alert('Cor: máximo 5 caracteres.');
  if (numeracao.length > 3) return alert('Numeração: máximo 3 dígitos.');
  if (quantidade < 1) return alert('Quantidade deve ser positiva.');

  numeracao = formatarNumeracao(numeracao);
  const item = gerarItem(produto, cor, numeracao);

  const existente = registros.find(r => r.item === item);
  if (existente) {
    const confirmar = confirm(
      `O item "${item}" já existe.\nDeseja somar ${quantidade} à quantidade atual (${existente.quantidade})?`
    );
    if (confirmar) {
      existente.quantidade += quantidade;
    } else {
      alert('Item duplicado não adicionado.');
      return;
    }
  } else {
    registros.push({ produto, cor, numeracao, item, quantidade });
  }

  localStorage.setItem('registros', JSON.stringify(registros));
  atualizarTabela();
  form.reset();
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
  if (!produto || produto.length > 5) return alert('Produto inválido.');

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

[filtroProduto, filtroCor, filtroItem].forEach(el =>
  el.addEventListener('input', atualizarTabela)
);

atualizarTabela();
