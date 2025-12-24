import { Calculator } from './calculator.js';

document.addEventListener('DOMContentLoaded', () => {
    const displayHistory = document.getElementById('history-line');
    const displayResult = document.getElementById('result-line');
    const calc = new Calculator();

    const updateDisplay = () => {
        displayHistory.innerText = calc.getExpression();
        displayResult.innerText = calc.getResult();
    };

    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            const key = button.getAttribute('data-key');
            if (key) {
                calc.handleInput(key);
                updateDisplay();
            }
        });
    });
});export class Calculator {
    constructor() {
        this.expression = '';
        this.result = '0';
        this.mode = 'COMP'; // Modes: COMP, CMPLX, MAT, EQN
        this.ans = 0;
        this.shiftMode = false;
        this.alphaMode = false;
        this.memory = 0; // Independent memory M
        this.eqnState = null; // State for Equation Mode
    }

    handleInput(key) {
        switch (key) {
            case 'AC':
                this.expression = '';
                this.result = '0';
                this.eqnState = null; // Reset EQN state on AC
                if (this.mode === 'EQN') {
                    this.result = "EQN Mode: Press = to start";
                }
                break;
            case 'DEL':
                this.expression = this.expression.slice(0, -1);
                break;
            case 'EQUALS':
                this.calculate();
                break;
            case 'ANS':
                this.expression += 'Ans';
                break;
            case 'PLUS':
                this.expression += '+';
                break;
            case 'MINUS':
                this.expression += '-';
                break;
            case 'MULTIPLY':
                this.expression += '*';
                break;
            case 'DIVIDE':
                this.expression += '/';
                break;
            case 'SHIFT':
                this.shiftMode = !this.shiftMode;
                return; // Don't add to expression, just toggle state
            case 'ALPHA':
                this.alphaMode = !this.alphaMode;
                return;
            case 'MODE':
                this.cycleMode();
                return;
            case 'ON':
                this.clearAll();
                return;
            case 'SIN':
                this.expression += this.shiftMode ? 'asin(' : 'sin(';
                break;
            case 'COS':
                this.expression += this.shiftMode ? 'acos(' : 'cos(';
                break;
            case 'TAN':
                this.expression += this.shiftMode ? 'atan(' : 'tan(';
                break;
            case 'LOG':
                this.expression += 'log10(';
                break;
            case 'LN':
                // natural log is log(x) in mathjs, but users might expect e^ if shift
                this.expression += this.shiftMode ? 'e^' : 'log(';
                break;
            case 'SQRT':
                this.expression += 'sqrt(';
                break;
            case 'X2':
                this.expression += '^2';
                break;
            case 'POW':
                this.expression += '^';
                break;
            case 'EXP':
                this.expression += 'e';
                break;
            case '(':
                this.expression += this.shiftMode ? '[' : '(';
                break;
            case ')':
                this.expression += this.shiftMode ? ']' : ')';
                break;
            case 'SD':
                // Using SD for comma in shift mode
                this.expression += this.shiftMode ? ',' : '';// Basic SD not impl
                break;
            case 'M+':
                if (this.shiftMode) {
                    this.expression += ';'; // Shift+M+ for semi-colon
                } else {
                    this.calculate(true);
                }
                break;
            case 'ENG':
                if (this.shiftMode) {
                    this.expression += 'i'; // Imaginary unit
                }
                break;
            default:
                this.expression += key;
        }

        // Reset shift after one use if desired
        if (this.shiftMode && key !== 'SHIFT') this.shiftMode = false;
        if (this.alphaMode && key !== 'ALPHA') this.alphaMode = false;
    }

    cycleMode() {
        const modes = ['COMP', 'CMPLX', 'MAT', 'EQN'];
        const currentIdx = modes.indexOf(this.mode);
        this.mode = modes[(currentIdx + 1) % modes.length];
        this.result = `Mode: ${this.mode}`;
        this.expression = '';
        this.eqnState = null; // Reset EQN state on mode switch

        if (this.mode === 'EQN') {
            this.result = "EQN Mode: Press = to start";
        }
    }

    clearAll() {
        this.expression = '';
        this.result = '0';
        this.mode = 'COMP';
        this.shiftMode = false;
        this.alphaMode = false;
        this.ans = 0;
        this.eqnState = null; // Reset EQN state
        this.memory = 0;
    }

    getExpression() {
        let displayExpr = this.expression;
        if (this.shiftMode) displayExpr = 'S ' + displayExpr;
        if (this.alphaMode) displayExpr = 'A ' + displayExpr;
        return displayExpr;
    }

    getResult() {
        return this.result;
    }

    calculate(addToMemory = false) {
        try {
            if (this.mode === 'EQN') {
                this.handleEquationSolver();
                return;
            }

            // Standard Calculation Mode
            let evalExpr = this.expression;

            // Handle Matrix notation corrections if needed (math.js uses standard [] format)
            // Just ensure 'Ans' is replaced
            evalExpr = evalExpr.replace(/Ans/g, `(${this.ans})`);

            if (typeof window.math !== 'undefined') {
                let res = window.math.evaluate(evalExpr);
                this.ans = res;
                // Format result for display (e.g. Matrix vs Number)
                if (typeof res === 'object' && res.isMatrix) {
                    this.result = res.toString();
                } else {
                    this.result = window.math.format(res, { precision: 10 });
                }

                if (addToMemory) {
                    // Only add scalar values to simple memory
                    if (typeof res === 'number') {
                        this.memory += res;
                        this.result = `M = ${this.memory}`;
                    }
                }
            } else {
                this.result = "Error: Math lib missing";
            }
        } catch (e) {
            this.result = 'Syntax Error';
            console.error(e);
        }
    }

    // Interactive Equation Solver State Machine
    handleEquationSolver() {
        if (!this.eqnState) {
            this.eqnState = { step: 'SELECT_TYPE' }; // Steps: SELECT_TYPE, A, B, C, RESULT
            this.result = "1:Quad(ax²+bx+c) 2:Cubic";
            this.expression = "";
            return;
        }

        const input = this.expression;

        switch (this.eqnState.step) {
            case 'SELECT_TYPE':
                if (input === '1') {
                    this.eqnState.type = 'QUADRATIC';
                    this.eqnState.step = 'GET_A';
                    this.result = "a?";
                    this.expression = "";
                } else if (input === '2') {
                    // Placeholder for Cubic
                    this.result = "Cubic Not Impl";
                    this.expression = "";
                    this.eqnState = null; // Reset
                } else {
                    this.result = "Select 1 or 2";
                    this.expression = "";
                }
                break;

            case 'GET_A':
                this.eqnState.a = parseFloat(input);
                if (isNaN(this.eqnState.a)) { this.result = "Invalid a"; return; }
                this.eqnState.step = 'GET_B';
                this.result = "b?";
                this.expression = "";
                break;

            case 'GET_B':
                this.eqnState.b = parseFloat(input);
                if (isNaN(this.eqnState.b)) { this.result = "Invalid b"; return; }
                this.eqnState.step = 'GET_C';
                this.result = "c?";
                this.expression = "";
                break;

            case 'GET_C':
                this.eqnState.c = parseFloat(input);
                if (isNaN(this.eqnState.c)) { this.result = "Invalid c"; return; }
                this.solveQuadratic();
                break;

            case 'SHOW_X1':
                this.result = `X2=${this.eqnState.x2}`;
                this.eqnState.step = 'SHOW_X2';
                break;

            case 'SHOW_X2':
                this.result = "Eqn Solved. AC to exit";
                this.eqnState = null; // Done
                break;
        }
    }

    solveQuadratic() {
        // ax^2 + bx + c = 0
        const { a, b, c } = this.eqnState;
        const d = b * b - 4 * a * c; // Discriminant

        if (d > 0) {
            const x1 = (-b + Math.sqrt(d)) / (2 * a);
            const x2 = (-b - Math.sqrt(d)) / (2 * a);
            this.eqnState.x1 = x1;
            this.eqnState.x2 = x2;
            this.result = `X1=${x1}`;
            this.eqnState.step = 'SHOW_X1';
        } else if (d === 0) {
            const x = -b / (2 * a);
            this.eqnState.x1 = x;
            this.eqnState.x2 = x;
            this.result = `X=${x}`;
            this.eqnState.step = 'SHOW_X1'; // Shows same X next click
        } else {
            // Complex roots
            const real = (-b / (2 * a)).toFixed(4);
            const imag = (Math.sqrt(-d) / (2 * a)).toFixed(4);
            const x1 = `${real} + ${imag}i`;
            const x2 = `${real} - ${imag}i`;
            this.eqnState.x1 = x1;
            this.eqnState.x2 = x2;
            this.result = `X1=${x1}`;
            this.eqnState.step = 'SHOW_X1';
        }
        this.expression = ""; // Clear for clarity
    }
}

