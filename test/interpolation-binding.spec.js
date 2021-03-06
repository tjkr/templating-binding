import {
  TemplatingBindingLanguage,
  InterpolationBindingExpression
} from '../src/binding-language';

import {
  SyntaxInterpreter
} from '../src/syntax-interpreter';

import {
  ObserverLocator,
  EventManager,
  DirtyChecker,
  Parser
} from 'aurelia-binding';

import {ViewResources} from 'aurelia-templating';
import {TaskQueue} from 'aurelia-task-queue';
import {initialize} from 'aurelia-pal-browser';
import {DOM} from 'aurelia-pal';

function createElement(html) {
  var div = DOM.createElement('div');
  div.innerHTML = html;
  return div.firstChild;
}

describe('InterpolationBinding', () => {
  var checkDelay = 40,
      array1, array2, tests,
      parser, eventManager, dirtyChecker, observerLocator, syntaxInterpreter, language, resources;

  beforeAll(() => {
    initialize();
    eventManager = new EventManager();
    dirtyChecker = new DirtyChecker();
    dirtyChecker.checkDelay = checkDelay / 2;
    observerLocator = new ObserverLocator(new TaskQueue(), eventManager, dirtyChecker, []);
    parser = new Parser();
    syntaxInterpreter = new SyntaxInterpreter(parser, observerLocator, eventManager);
    language = new TemplatingBindingLanguage(parser, observerLocator, syntaxInterpreter);
    resources = new ViewResources();
  });

  function getBinding(model, view, attrName) {
    var attrValue, info, binding;
    attrValue = view.getAttribute(attrName);
    info = language.inspectAttribute(resources, attrName, attrValue);
    binding = info.expression.createBinding(view);
    return binding;
  }

  function reset() {
    array1 = [1,2,3];
    array2 = ['a','b','c'];
    tests = [
      { change: (m, p) => m[p] = '',        result: () => '' },
      { change: (m, p) => m[p] = null,      result: () => '' },
      { change: (m, p) => m[p] = undefined, result: () => '' },
      { change: (m, p) => m[p] = 0,         result: () => '0' },
      { change: (m, p) => m[p] = false,     result: () => 'false' },
      { change: (m, p) => m[p] = true,      result: () => 'true' },
      { change: (m, p) => m[p] = 'baz',     result: () => 'baz' },
      { change: (m, p) => m[p] = {},        result: () => ({}.toString()) },
      { change: (m, p) => m[p] = { foo: 'foo', bar: 'bar' }, result: () => ({ foo: 'foo', bar: 'bar' }.toString()) },
      { change: (m, p) => m[p] = array1,       result: () => array1.toString() },
      { change: (m, p) => array1.push(4),      result: () => array1.toString() },
      { change: (m, p) => array1.pop(),        result: () => array1.toString() },
      { change: (m, p) => array1.splice(1, 1), result: () => array1.toString() },
      { change: (m, p) => array1.splice(2, 0, array2), result: () => array1.toString() },
      { change: (m, p) => m[p] = array2,       result: () => array2.toString() },
      { change: (m, p) => array2.push('d'),    result: () => array2.toString() },
      { change: (m, p) => m[p] = array1,       result: () => array1.toString() },
    ];
  }

  describe('single expression', () => {
    var viewModel, view, binding, targetProperty, observer1, observer2;

    beforeAll(() => {
      reset();
      viewModel = { foo: 'bar' };
      view = createElement('<test foo="${foo}"></test>');
      binding = getBinding(viewModel, view, 'foo');
      targetProperty = binding.targetProperty;
      observer1 = observerLocator.getArrayObserver(array1);
      observer2 = observerLocator.getArrayObserver(array2);
    });

    it('binds', () => {
      binding.bind(viewModel);
      expect(targetProperty.getValue()).toBe(viewModel.foo);
    });

    it('handles changes', done => {
      var next = () => {
        var test = tests.splice(0, 1)[0], result;
        if (test) {
          test.change(viewModel, 'foo');
          result = test.result();
          setTimeout(() => {
            expect(targetProperty.getValue()).toBe(result);
            next();
          }, checkDelay);
        } else {
          done();
        }
      };

      next();
    });

    it('unbinds', () => {
      expect(observer1.hasSubscribers()).toBe(true);
      expect(observer2.hasSubscribers()).toBe(false);

      binding.unbind();

      expect(observer1.hasSubscribers()).toBe(false);
      expect(binding.source).toBe(undefined);
    });
  });

  describe('multiple expressions', () => {
    var viewModel, view, binding, targetProperty, observer1, observer2;

    beforeAll(() => {
      reset();
      viewModel = { foo: 'foo', bar: 'bar', baz: 'baz' };
      view = createElement('<test foo=" ${foo} hello ${bar} world ${baz} "></test>');
      binding = getBinding(viewModel, view, 'foo');
      targetProperty = binding.targetProperty;
      observer1 = observerLocator.getArrayObserver(array1);
      observer2 = observerLocator.getArrayObserver(array2);
    });

    it('binds', () => {
      binding.bind(viewModel);
      expect(targetProperty.getValue()).toBe(' foo hello bar world baz ');
    });

    it('handles changes', done => {
      var next = () => {
        var test = tests.splice(0, 1)[0], result;
        if (test) {
          test.change(viewModel, 'foo');
          test.change(viewModel, 'bar');
          test.change(viewModel, 'baz');
          result = test.result();
          setTimeout(() => {
            expect(targetProperty.getValue()).toBe(' ' + result + ' hello ' + result + ' world ' + result + ' ');
            next();
          }, checkDelay);
        } else {
          done();
        }
      };

      next();
    });

    it('unbinds', () => {
      expect(observer1.hasSubscribers()).toBe(true);
      expect(observer2.hasSubscribers()).toBe(false);

      binding.unbind();

      expect(observer1.hasSubscribers()).toBe(false);
      expect(binding.source).toBe(undefined);
    });
  });

  describe('repeated expressions', () => {
    var viewModel, view, binding, targetProperty, observer1, observer2;

    beforeAll(() => {
      reset();
      viewModel = { foo: 'foo' };
      view = createElement('<test foo=" ${foo} hello ${foo} world ${foo} "></test>');
      binding = getBinding(viewModel, view, 'foo');
      targetProperty = binding.targetProperty;
      observer1 = observerLocator.getArrayObserver(array1);
      observer2 = observerLocator.getArrayObserver(array2);
    });

    it('binds', () => {
      binding.bind(viewModel);
      expect(targetProperty.getValue()).toBe(' foo hello foo world foo ');
    });

    it('handles changes', done => {
      var next = () => {
        var test = tests.splice(0, 1)[0], result;
        if (test) {
          test.change(viewModel, 'foo');
          result = test.result();
          setTimeout(() => {
            expect(targetProperty.getValue()).toBe(' ' + result + ' hello ' + result + ' world ' + result + ' ');
            next();
          }, checkDelay);
        } else {
          done();
        }
      };

      next();
    });

    it('unbinds', () => {
      expect(observer1.hasSubscribers()).toBe(true);
      expect(observer2.hasSubscribers()).toBe(false);

      binding.unbind();

      expect(observer1.hasSubscribers()).toBe(false);
      expect(binding.source).toBe(undefined);
    });
  });
});
