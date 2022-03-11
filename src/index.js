const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

/* BANCO DE DADOS */
const clientes = [];

/* MIDDLEWARES E FUNÇÕES */
function cpfJaCadastrado (req, res, next) {
    const { cpf } = req.headers;

    const cliente = clientes.find(cliente => cliente.cpf === cpf);

    if(!cliente) {
        return res.status(400).json({ error: 'A conta informada não existe!' })
    }

    req.cliente = cliente;

    return next();
}

function pegarValor(extrato) {
   const valorCalculado = extrato.reduce((acumulador, operacao) => {
        if(operacao.tipo === 'credito') {
            return acumulador + operacao.valor;
        } else {
            return acumulador - operacao.valor;
        }
    }, 0);

    return valorCalculado;
}

/* CONTA BANCÁRIA */
app.get('/conta', cpfJaCadastrado, (req, res) => {
    const { cliente } = req;

    return res.status(200).json(cliente);
});

app.post('/conta', (req, res) => {

    const { cpf, nome } = req.body;

    const cpfJaCadastrado = clientes.some(cliente => cliente.cpf === cpf);

    if(cpfJaCadastrado) {
        return res.status(400).json({ error: 'O CPF informado já está cadastrado!'});
    } else {
        clientes.push({
            cpf,
            nome,
            id: uuidv4(),
            extrato: []
        });
    
        return res.status(201).json({ sucesso: 'Conta criada com sucesso!' })
    }
});

app.delete('/conta', cpfJaCadastrado, (req, res) => {
    const { cliente } = req;

    clientes.splice(cliente, 1);

    return res.status(200).json({ sucesso: 'Conta removida com sucesso! '});
})

app.put('/conta', cpfJaCadastrado, (req, res) => {
    const { nome } = req.body;
    const { cliente } = req;

    cliente.nome = nome;

    return res.status(200).json({ sucesso: 'Nome alterado com sucesso!' })
});

/* EXTRATO BANCÁRIO */
app.get('/extrato', cpfJaCadastrado, (req, res) => {
    const { cliente } = req;

    return res.status(200).json(cliente.extrato);
});

app.get('/extrato/data', cpfJaCadastrado, (req, res) => {
    const { cliente } = req;
    const { data } = req.query;

    const dataFormatador = new Date(data + ' 00:00');

    const extrato = cliente.extrato.filter(extrato => extrato.data_atual.toDateString() === new Date(dataFormatador).toDateString());

    return res.status(200).json(extrato);
});

/* DEPOSITO BANCÁRIO */
app.post('/deposito', cpfJaCadastrado, (req, res) => {
    const { valor, descricao } = req.body;

    const { cliente } = req;

    const extratoOperacao = {
        valor,
        descricao,
        data_atual: new Date(),
        tipo: 'credito'
    };

    cliente.extrato.push(extratoOperacao);

    return res.status(200).json({ sucesso: 'Depósito efetuado com sucesso!' });
}); 

/* SAQUE BANCÁRIO */
app.post('/saque', cpfJaCadastrado, (req, res) => {
    const { valor } = req.body;
    const { cliente } = req;

    const valorCalculado = pegarValor(cliente.extrato);

    if(valorCalculado <= valor) {
        return res.status(400).json({ error: 'Seu saldo é insuficiente para essa operação!' });
    } 
    
    const extratoOperacao = {
        valor,
        data_atual: new Date(),
        tipo: 'debito'
    };

    cliente.extrato.push(extratoOperacao);

    return res.status(200).json({ error: 'Saque realizado com sucesso!' });
})

app.get('/extrato2', cpfJaCadastrado, (req, res) => {
    const { cliente } = req;

    const valor = pegarValor(cliente.extrato);

    return res.status(200).json(valor);
})

app.listen(3333, () => {
    console.log('API conectada com sucesso.');
});