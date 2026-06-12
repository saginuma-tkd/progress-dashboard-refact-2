import ast
import operator
from typing import Callable, Dict, Type

# 🟢 辞書を「2つの値を使う計算（2項演算）」と「1つの値を使う計算（単項演算）」に分離
BIN_OPS: Dict[Type[ast.operator], Callable[[float, float], float]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
}

UNARY_OPS: Dict[Type[ast.unaryop], Callable[[float], float]] = {
    ast.USub: operator.neg
}

def calculate_duration(formula_str: str, x: float, y: float, t:float) -> float:
    """
    テナント長が設定した数式文字列(formula_str)に、
    生徒の偏差値(x)とルートレベル(y)を代入して安全に計算する関数
    """
    
    def _eval(node: ast.AST) -> float:
        if isinstance(node, ast.Constant):
            # 型チェッカーを安心させるため、変数に入れてから判定
            val = node.value
            if isinstance(val, (int, float)):
                return float(val)
            raise ValueError("数値以外の値が含まれています")
            
        elif isinstance(node, ast.Num):     # Python 3.7以前の互換性用
            return float(node.n)  # type: ignore
            
        elif isinstance(node, ast.Name):
            if node.id == 'x':
                return float(x)
            elif node.id == 'y':
                return float(y)
            elif node.id == 't':
                return float(t)
            raise ValueError(f"許可されていない変数です: {node.id} (xとyとtのみ使用可能です)")
            
        elif isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in BIN_OPS:
                raise ValueError("サポートされていない記号が含まれています")
            
            left_val = _eval(node.left)
            right_val = _eval(node.right)
            
            if op_type == ast.Div and right_val == 0.0:
                raise ValueError("ゼロで割ることはできません")
                
            # 2項演算の辞書から取得して実行
            func_bin = BIN_OPS[op_type]
            return float(func_bin(left_val, right_val))
            
        elif isinstance(node, ast.UnaryOp):
            op_type_unary = type(node.op)
            if op_type_unary not in UNARY_OPS:
                raise ValueError("サポートされていない記号が含まれています")
                
            # 単項演算の辞書から取得して実行
            func_unary = UNARY_OPS[op_type_unary]
            return float(func_unary(_eval(node.operand)))
            
        else:
            raise TypeError("数式として無効な表現が含まれています")

    try:
        tree = ast.parse(formula_str.strip(), mode='eval')
        result = _eval(tree.body)
        return max(0.0, round(result, 2))
        
    except SyntaxError:
        raise ValueError("数式の文法が間違っています（例: 記号が連続している、括弧が閉じていない等）")
    except Exception as e:
        raise ValueError(f"計算エラー: {str(e)}")